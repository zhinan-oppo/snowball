import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import posthtml, { PostHTML } from 'posthtml';
import webpack from 'webpack';

import {
  isDuplicatedOrFail,
  renderContent,
  writeToFile,
  terseAttributeValue,
} from './utils';

interface Options {
  namespace?: string;
  dryRun: boolean;
  clean: boolean;
  keyAttrName: string;
  nsAttrName: string;
  keyAttrAlias: Record<string, string>;
  wrapKey: (key: string) => string;
  /**
   * `string`: write translation files to this path
   * `undefined`(default): write translations files to `compiler.outputPath`
   * `false`: don't write translation files
   */
  outputPath?: string | false;
  mergedFilename?: string;
}

export class TransWebpackPlugin implements webpack.Plugin {
  private readonly options: Options;

  constructor({
    namespace,
    outputPath,
    mergedFilename,
    keyAttrName = 't-key',
    nsAttrName = 't-ns',
    dryRun = false,
    clean = true,
    wrapKey = (key) => `@lang('${key}')`,
    keyAttrAlias = { img: 'src', video: 'src' },
  }: Partial<Options> = {}) {
    this.options = {
      keyAttrName,
      nsAttrName,
      dryRun,
      clean,
      wrapKey,
      outputPath,
      keyAttrAlias,
      mergedFilename,
      namespace: namespace?.replace(/\.*$/, '.'),
    };
  }

  apply(compiler: webpack.Compiler): void {
    const { outputPath, dryRun, mergedFilename } = this.options;
    const translationsByFilename = new Map<string, Map<string, string>>();

    compiler.hooks.compilation.tap(
      TransWebpackPlugin.name,
      (compilation: webpack.compilation.Compilation) => {
        const logger = compilation.getLogger(TransWebpackPlugin.name);

        const hooks = HtmlWebpackPlugin.getHooks(compilation);
        hooks.beforeEmit.tapPromise(
          TransWebpackPlugin.name,
          ({ html, outputName, plugin }) => {
            const { name } = path.parse(outputName);
            const outputFilename = `${name}.trans.json`;
            const fullPath =
              outputPath !== false
                ? path.resolve(
                    outputPath || compilation.compiler.outputPath,
                    outputFilename,
                  )
                : undefined;

            return new Promise((resolve, reject) => {
              this.transformTransAttrs(html)
                .then(({ html: htmlTransformed, translations }) => {
                  logger.log(`Translations in ${outputName}`);
                  logger.log(translations);

                  translationsByFilename.set(outputFilename, translations);
                  const fileWritten =
                    dryRun || !fullPath
                      ? Promise.resolve()
                      : writeToFile(fullPath, translations).then(() => {
                          logger.info(`Translations written to ${fullPath}`);
                        });
                  fileWritten
                    .then(() => {
                      resolve({
                        outputName,
                        plugin,
                        html: htmlTransformed,
                      });
                    })
                    .catch(reject);
                })
                .catch(reject);
            });
          },
        );
      },
    );

    if (outputPath !== false) {
      const logger = compiler.getInfrastructureLogger(TransWebpackPlugin.name);
      compiler.hooks.done.tapPromise(TransWebpackPlugin.name, (stats) => {
        if (!mergedFilename) {
          return Promise.resolve(stats);
        }
        const fullPath = path.resolve(
          outputPath || compiler.outputPath,
          mergedFilename,
        );
        return new Promise((resolve, reject) => {
          const translations = new Map<string, string>();
          translationsByFilename.forEach((trans) => {
            trans.forEach((value, key) => {
              try {
                if (!isDuplicatedOrFail(translations, key, value)) {
                  translations.set(key, value);
                }
              } catch (e) {
                reject(e);
              }
            });
          });
          if (dryRun) {
            return resolve(stats);
          }

          writeToFile(fullPath, translations)
            .then(() => {
              logger.info(`Translation files are merged into ${fullPath}`);
              resolve(stats);
            })
            .catch(reject);
        });
      });
    }
  }

  private transformTransAttrs(html: string) {
    const { dryRun, namespace } = this.options;

    const translations = new Map<string, string>();

    const processNode = (node: PostHTML.Node, prefix = ''): PostHTML.Node => {
      if (typeof node === 'string') {
        return node;
      }

      const { ns, key, attrKeys, attrs = {} } = this.parseTransAttrs(
        node.attrs,
        node.tag,
      );
      if (ns) {
        prefix += `${ns}.`;
      }

      attrKeys.forEach(({ key: _key, value, name }) => {
        const key = `${prefix}${_key || value}`;
        if (!isDuplicatedOrFail(translations, key, value)) {
          translations.set(key, value);
        }
        attrs[name] = this.getWrappedKey(key);
      });
      if (!dryRun) {
        node.attrs = attrs;
      }

      if (typeof key === 'string') {
        const content = renderContent(node.content);
        const contentKey = `${prefix}${key || content}`;
        if (!isDuplicatedOrFail(translations, contentKey, content)) {
          translations.set(contentKey, content);
        }
        if (!dryRun) {
          node.content = [this.getWrappedKey(contentKey)];
        }
      } else if (node.content) {
        node.content = node.content.map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          return processNode(item, prefix);
        });
      }

      return node;
    };
    return new Promise(
      (
        resolve: (res: {
          html: string;
          translations: Map<string, string>;
        }) => void,
        reject,
      ) => {
        posthtml()
          .use((tree) =>
            tree instanceof Array
              ? tree.map((node) => processNode(node, namespace))
              : processNode(tree, namespace),
          )
          .process(html)
          .then(({ html }) => {
            resolve({ html, translations });
          })
          .catch(reject);
      },
    );
  }

  private parseTransAttrs(
    attrs?: Record<string, string | void> | void,
    tag?: string | void,
  ) {
    if (!attrs) {
      return {
        attrKeys: [],
      };
    }

    const { keyAttrName, nsAttrName, keyAttrAlias, clean } = this.options;
    const reg = new RegExp(`^${keyAttrName}:(.*)$`);

    const { [keyAttrName]: keyAttrValue, [nsAttrName]: ns } = attrs;
    if (tag && keyAttrAlias[tag] && typeof keyAttrValue === 'string') {
      const name = `${keyAttrName}:${keyAttrAlias[tag]}`;
      attrs[name] = terseAttributeValue(keyAttrName, keyAttrValue);
      attrs[keyAttrName] = undefined;
    }

    const attrKeys: Array<{ name: string; key: string; value: string }> = [];
    const attrsNormal: Record<string, string | void> = {};
    Object.keys(attrs).forEach((attr) => {
      if (attr === keyAttrName || attr === nsAttrName) {
        if (clean) {
          attrs[attr] = undefined;
        }
        return;
      }
      const matches = reg.exec(attr);
      if (!matches) {
        attrsNormal[attr] = attrs[attr];
      } else {
        const keyValue = attrs[attr];
        if (matches[1] && typeof keyValue === 'string') {
          const valueAttr = matches[1];
          attrKeys.push({
            name: valueAttr,
            key: terseAttributeValue(attr, keyValue),
            value: attrs[valueAttr] || '',
          });
        }
        if (clean) {
          attrs[attr] = undefined;
        }
      }
    });

    return {
      ns,
      attrKeys,
      key:
        typeof keyAttrValue === 'string'
          ? terseAttributeValue(keyAttrName, keyAttrValue)
          : undefined,
      attrs: attrsNormal,
    };
  }

  private getWrappedKey(key: string) {
    return this.options.wrapKey(key);
  }
}
