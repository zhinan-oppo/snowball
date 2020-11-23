import { Rule } from 'postcss';

export interface Media {
  alias: string;
  query?: string;
  ratio?: number;
}

export interface RuleOptions {
  medias: Media[];
}

export interface Options extends RuleOptions {
  from?: string;
  to?: string;
  round?: (n: number) => number;
  medias: Array<Required<Media>>;
  clearOptionProps?: boolean;
  defaultRuleOptions: RuleOptions;
}

const validRuleOptionProps: Array<{
  name: keyof RuleOptions;
  regexp: RegExp;
}> = [{ name: 'medias', regexp: new RegExp('medias', 'i') }];

function matchRuleOptionName(str: string) {
  const found = validRuleOptionProps.find(({ regexp }) =>
    regexp.test(str.replace(/[-_]/g, '')),
  );
  return found && found.name;
}

function parseOptionMedias(value: string) {
  return value
    .split(/,\s*/)
    .filter(Boolean)
    .map((mediaStr) => {
      const [alias, ratioStr] = mediaStr.split(/ +/).filter(Boolean);
      return {
        alias,
        ratio:
          (typeof ratioStr === 'string' && parseFloat(ratioStr)) || undefined,
      };
    });
}

export function mergeOptionsByDecls({
  container,
  propPrefix,
  options = { medias: [] },
  clearProps = false,
}: {
  container: Rule;
  propPrefix: string;
  options?: RuleOptions;
  clearProps?: boolean;
}): RuleOptions {
  const newOptions: RuleOptions = {
    ...options,
  };
  const matcher = new RegExp(`^${propPrefix}([-_0-9a-z$#]+)`, 'i');
  container.walkDecls(matcher, (decl) => {
    const matches = matcher.exec(decl.prop);
    if (matches) {
      const name = matchRuleOptionName(matches[1]);

      if (name === 'medias') {
        newOptions.medias = parseOptionMedias(decl.value);
      } else {
        return undefined;
      }

      if (clearProps) {
        container.removeChild(decl);
      }
    }
  });
  return newOptions;
}
