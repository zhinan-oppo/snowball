import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import posthtml, { PostHTML } from 'posthtml';
import webpack from 'webpack';

import { isDuplicatedOrFail, renderContent, writeToFile } from './utils';

interface Options {
  namespace?: string;
  dryRun: boolean;
  keyAttrName: string;
  nsAttrName: string;
  keyAttrAlias: Record<string, string>;
  wrapKey: (key: string) => string;
  outputPath?: string;
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
    wrapKey = (key) => `@lang('${key}')`,
    keyAttrAlias = { img: 'src', video: 'src' },
  }: Partial<Options> = {}) {
    this.options = {
      keyAttrName,
      nsAttrName,
      dryRun,
      wrapKey,
      outputPath,
      keyAttrAlias,
      mergedFilename,
      namespace: namespace?.replace(/\.*$/, '.'),
    };
  }

  apply(compiler: webpack.Compiler) {
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
            const fullPath = path.resolve(
              outputPath || compilation.compiler.outputPath,
              outputFilename,
            );

            return new Promise((resolve, reject) => {
              this.transformTransAttrs(html)
                .then(({ html: htmlTransformed, translations }) => {
                  logger.log(`Translations in ${outputName}`);
                  logger.log(translations);

                  translationsByFilename.set(outputFilename, translations);
                  const fileWritten = dryRun
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
        writeToFile(fullPath, translations)
          .then(() => {
            logger.info(`Translation files are merged into ${fullPath}`);
            resolve(stats);
          })
          .catch(reject);
      });
    });
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
        const key = `${prefix}${_key}`;
        if (!isDuplicatedOrFail(translations, key, value)) {
          translations.set(key, value);
        }
        attrs[name] = this.getWrappedKey(key);
      });
      if (!dryRun) {
        node.attrs = attrs;
      }

      if (key) {
        const contentKey = `${prefix}${key}`;
        const content = renderContent(node.content);
        if (!isDuplicatedOrFail(translations, contentKey, content)) {
          translations.set(contentKey, content);
        }
        if (!dryRun) {
          node.content = [this.getWrappedKey(`${prefix}${key}`)];
        }
      } else if (!dryRun && node.content) {
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
          .use((tree) => {
            tree.walk((node) => processNode(node, namespace));
          })
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

    const { keyAttrName, nsAttrName, keyAttrAlias } = this.options;
    const reg = new RegExp(`^${keyAttrName}:(.*)$`);

    if (tag && keyAttrAlias[tag] && attrs[keyAttrName]) {
      const name = `${keyAttrName}:${keyAttrAlias[tag]}`;
      attrs[name] = attrs[keyAttrName];
      attrs[keyAttrName] = undefined;
    }
    const { [keyAttrName]: key, [nsAttrName]: ns } = attrs;
    const attrKeys: Array<{ name: string; key: string; value: string }> = [];
    const attrsNormal: Record<string, string | void> = {};
    Object.keys(attrs).forEach((attr) => {
      if (attr === keyAttrName || attr === nsAttrName) {
        return;
      }
      const value = attrs[attr];
      const matches = reg.exec(attr);
      if (!matches) {
        attrsNormal[attr] = value;
      } else if (matches[1] && value) {
        const name = matches[1];
        attrKeys.push({ name, key: value, value: attrs[name] || '' });
      }
    });

    return {
      ns,
      key,
      attrKeys,
      attrs: attrsNormal,
    };
  }

  private getWrappedKey(key: string) {
    return this.options.wrapKey(key);
  }
}
