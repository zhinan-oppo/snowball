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

  private rootRuleOptions: RuleOptions = { medias: [] };

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
      },
      Rule: (rule) => this.handleRule(rule),
    };
  }

  private handleRule(rule: Rule) {
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
    medias
      .map(({ alias, ratio, query }) => {
        const media = this.mediaMap[alias];
        return {
          alias,
          ratio: ratio || media?.ratio || 0,
          query: query || media?.query,
        };
      })
      .filter(({ ratio, query }) => ratio > 0 && query)
      .forEach(({ ratio, query, alias }) => {
        const newRule = this.transformDecls(rule.clone(), ratio / baseRatio);
        if (newRule.nodes.length > 0) {
          const newAtMediaRule = new AtRule({
            name: 'media',
            params: query,
            source: rule.source,
          });
          // if (!this.options.clearOptionProps) {
          //   newAtMediaRule.append(
          //     new Comment({
          //       source: newRule.source,
          //       text: alias,
          //     }),
          //   );
          // }
          newAtMediaRule.append(newRule);

          const { parent, container } = getParentNotAtMedia(rule);
          parent.insertAfter(container, newAtMediaRule);
        }
      });

    /**
     * 最后转换当前 rule 中的 rpx
     */
    this.transformDecls(rule, 1, false);
  }

  private transformDecls(rule: Rule, ratio: number, removeUnmatched = true) {
    const nodes: ChildNode[] = [];
    rule.each((child) => {
      if (child.type === 'decl' && this.unitMatcher.test(child.value)) {
        nodes.push(this.transformDecl(child, ratio));
        if (!this.options.clearOptionProps) {
          nodes.push(
            new Comment({
              source: rule.source,
              text: `ratio: ${ratio}`,
            }),
          );
        }
      } else if (!removeUnmatched) {
        nodes.push(child);
      }
    });
    rule.nodes = nodes;

    return rule;
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
