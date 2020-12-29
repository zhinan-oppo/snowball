import { Plugin } from 'postcss';

export interface Options {
  from: string;
  to?: string;
  fallback?: string;
}

function createPlugin({
  from,
  to = `--${from}`,
  fallback = `1${from}`,
}: Options): Plugin {
  const matcher = new RegExp(
    `(?<!var\\(${to},\\s*)(-?\\d+\\.?\\d*|-?\\d*\\.?\\d+)${from}`,
    'ig',
  );
  return {
    postcssPlugin: 'postcss-unit2var',
    Once(root, { postcss: { list } }) {
      root.walkDecls((decl) => {
        let found = false;
        const replaced = list
          .comma(decl.value)
          .map((value) => {
            return list
              .space(value)
              .map((v) => {
                if (matcher.test(v)) {
                  found = true;
                  return v.replace(
                    matcher,
                    `${
                      /^calc\(/i.test(v) ? '' : 'calc'
                    }($1 * var(${to}, ${fallback}))`,
                  );
                }
                return v;
              })
              .join(' ');
          })
          .join(', ');
        if (found) {
          if (decl.parent) {
            const override = decl.clone({ value: replaced });
            decl.parent.insertAfter(decl, override);
          }
        }
      });
    },
  };
}

export default createPlugin;
export const postcss = true;
