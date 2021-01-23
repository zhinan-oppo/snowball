import {
  AtRule,
  ChildNode,
  Comment,
  Container,
  Declaration,
  Plugin,
  Root,
  Rule,
} from 'postcss';

import { Media, mergeOptionsByDecls, Options, RuleOptions } from './options';

function isAtMediaRule(container?: Container): container is AtRule {
  if (!container || container.type !== 'atrule') {
    return false;
  }
  return (container as AtRule).name === 'media';
}

function getParentNotAtMedia(
  container: Rule | AtRule,
): {
  parent: AtRule | Rule | Root;
  container: AtRule | Rule | Declaration;
} {
  const parent = container.parent as AtRule | Rule | Root;
  if (isAtMediaRule(parent)) {
    const res = getParentNotAtMedia(parent);
    if (res.parent) {
      return res;
    }
  }
  return { parent, container: container as AtRule | Rule };
}

function matchAll(str: string, matcher: RegExp): string[][] {
  const res: string[][] = [];
  let matches = matcher.exec(str);
  while (matches) {
    res.push(matches);
    matches = matcher.exec(str);
  }
  return res;
}

/**
 * TODO: 现在会有重复以及无效的遍历，待优化
 */
class RPXPlugin {
  static readonly pluginName = 'postcss-rpx';

  private readonly options: Required<Options>;
  private readonly optionPropPrefix: string;
  private readonly mediaMap: Record<string, Required<Media> | undefined>;

  private rootRuleOptions: RuleOptions;

  constructor(options: Options) {
    this.options = {
      from: 'rpx',
      to: 'px',
      round: (n) => n,
      clearOptionProps: true,
      ...options,
    };
    this.optionPropPrefix = `--postcss-rpx-${options.from}-`;

    this.mediaMap = {};
    this.options.medias.forEach((media) => {
      this.mediaMap[media.alias] = media;
    });
    this.rootRuleOptions = { ...options.defaultRuleOptions };
  }

  get unitMatcher(): RegExp {
    return new RegExp(
      `(-?\\d+\\.?\\d*|-?\\d*\\.?\\d+)${this.options.from}`,
      'ig',
    );
  }

  get processor(): Plugin {
    return {
      postcssPlugin: RPXPlugin.pluginName,
      Once: (root) => {
        root.each((node) => {
          if (node.type === 'rule' && node.selectors.includes(':root')) {
            this.rootRuleOptions = mergeOptionsByDecls({
              container: node,
              options: this.rootRuleOptions,
              propPrefix: this.optionPropPrefix,
              clearProps: this.options.clearOptionProps,
            });
            if (node.nodes.length < 1) {
              root.removeChild(node);
            }
          }
        });

        // root.walkDecls((decl) => {
        //   if (this.unitMatcher.test(decl.value)) {
        //     console.log(
        //       `${(decl.parent as Rule).selector}: { ${decl.prop}: ${
        //         decl.value
        //       } }`,
        //     );
        //   }
        // });
        root.walkRules((rule) => this.handleRule(rule));
      },
    };
  }

  private handleRule(rule: Rule) {
    const declsToTransform = this.extractDeclsToTransform(rule);
    if (declsToTransform.length < 1) {
      return;
    }

    const {
      medias: [baseMedia, ...medias],
    } = mergeOptionsByDecls({
      container: rule,
      options: this.rootRuleOptions,
      propPrefix: this.optionPropPrefix,
      clearProps: this.options.clearOptionProps,
    });

    const baseRatio =
      (baseMedia &&
        (baseMedia.ratio || this.mediaMap[baseMedia.alias]?.ratio)) ||
      1;

    /**
     * 转换 rule.declarations 中的 rpx，
     * 并包进新建的 AtMediaRule 中
     */
    [baseMedia, ...medias]
      .map(({ alias, ratio, query }) => {
        const media = this.mediaMap[alias];
        return {
          alias,
          ratio: ratio || media?.ratio || 0,
          query: query || media?.query,
        };
      })
      .filter(({ ratio, query }) => ratio > 0 && query)
      .reverse() // 使得 insertAfter 之后的顺序正常
      .forEach(({ ratio, query, alias }) => {
        const nodes = this.transformDecls(declsToTransform, ratio / baseRatio);
        if (nodes.length > 0) {
          const newRule = new Rule({
            nodes,
            source: rule.source,
            selector: rule.selector,
            selectors: [...rule.selectors],
          });
          const newAtMediaRule = new AtRule({
            name: 'media',
            params: query,
            source: rule.source,
          });
          if (!this.options.clearOptionProps) {
            newAtMediaRule.append(
              new Comment({
                source: rule.source,
                text: `@${alias} ratio: ${ratio / baseRatio}`,
                raws: {
                  before: '\n  ',
                  left: ' ',
                  right: ' ',
                },
              }),
            );
          }
          newAtMediaRule.append(newRule);

          const { parent, container } = getParentNotAtMedia(rule);
          parent.insertAfter(container, newAtMediaRule);
        }
      });
  }

  private extractDeclsToTransform(rule: Rule) {
    const decls: Declaration[] = [];
    rule.each((child) => {
      if (child.type === 'decl' && this.unitMatcher.test(child.value)) {
        // 记录
        decls.push(child);

        if (!this.options.clearOptionProps) {
          rule.insertBefore(
            child,
            new Comment({
              source: child.source,
              text: `${child.prop}: ${child.value}`,
              raws: {
                before: '\n\t',
                left: ' ',
                right: ' ',
              },
            }),
          );
        }

        // 移除
        rule.removeChild(child);
      }
    });
    return decls;
  }

  private transformDecls(decls: Declaration[], ratio: number) {
    const nodes: ChildNode[] = [];

    decls.forEach((decl) => {
      decl = decl.clone();

      if (this.unitMatcher.test(decl.value)) {
        nodes.push(this.transformDecl(decl, ratio));
      }
    });

    return nodes;
  }

  private transformDecl(decl: Declaration, ratio: number) {
    matchAll(decl.value, this.unitMatcher)
      .map(([match, valueStr]) => {
        return {
          match,
          value: parseFloat(valueStr),
        };
      })
      .forEach(({ match, value }) => {
        decl.value = decl.value.replace(
          match,
          `${this.options.round(value * ratio)}${this.options.to}`,
        );
      });
    return decl;
  }
}

export function createPlugin(options: Options): Plugin {
  const plugin = new RPXPlugin(options);

  return plugin.processor;
}
