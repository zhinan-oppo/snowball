import posthtml, { PostHTML } from 'posthtml';
import { loader } from 'webpack';

interface Options {
  srcAttrName: string;
  defaultDstAttr: string;
  type: 'src' | 'srcset';
  medias: Array<{
    width?: { min?: number; max?: number };
    factor: number;
    alias: string;
  }>;
  prepareURL?: (url: string, factors: string | number, attr: string) => string;
}

function createPlugin({
  type = 'src',
  srcAttrName = 'z-src',
  defaultDstAttr = type === 'src' ? 'data-src' : 'data-srcset',
  medias = [{ factor: 1, alias: 'default' }],
  prepareURL = (url, factor) =>
    url.replace(
      /^~?/,
      `~!!cache-loader!image-loader?-esModule,name=[path][name].[md5:contenthash:hex:6].[ext],type=${type},factor=${factor}!`,
    ),
  root,
  shouldRemoveSrc = true,
}: Partial<Options> & { root?: string; shouldRemoveSrc?: boolean } = {}) {
  const attrReg = new RegExp(`^${srcAttrName}(:(.*))?$`);
  const factors = medias.map(({ factor }) => factor);
  const processNode = async (node: PostHTML.Node) => {
    const { attrs, content } = node;
    if (attrs) {
      await Promise.all(
        Object.keys(attrs).map(async (attr) => {
          const value = attrs[attr];
          const matches = attr.match(attrReg);
          if (!value || !matches) {
            return;
          }
          const [, hasDst, maybeDst] = matches;
          const dstAttr = (hasDst && maybeDst) || defaultDstAttr;
          let url = value;
          if (root && /^\//.test(url)) {
            url = `${root}${url}`;
          }
          if (type === 'srcset') {
            attrs[dstAttr] = factors
              .map((factor) => prepareURL(url, factor, attr))
              .join(', ');
          } else {
            medias.forEach(({ alias, factor }) => {
              attrs[`${dstAttr}-${alias}`] = prepareURL(url, factor, attr);
            });
          }

          attrs[attr] = shouldRemoveSrc
            ? undefined
            : prepareURL(url, factors.join('_'), attr);
        }),
      );
    }
    if (content) {
      await Promise.all(
        content.map((child) =>
          typeof child === 'string' ? undefined : processNode(child),
        ),
      );
    }
    return node;
  };

  return (tree: PostHTML.Node | PostHTML.Node[]) => {
    return tree instanceof Array
      ? Promise.all(tree.map((node) => processNode(node)))
      : processNode(tree);
  };
}

export function createProcessor(
  conf: Array<Partial<Options>>,
  mode?: 'development' | 'production',
) {
  return async (html: string, loader: loader.LoaderContext) => {
    const { html: htmlProcessed } = await posthtml(
      conf.map((options) =>
        createPlugin({
          ...options,
          shouldRemoveSrc: (mode || loader.mode) !== 'development',
        }),
      ),
    ).process(html);
    return htmlProcessed;
  };
}
