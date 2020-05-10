import { getOptions, parseQuery } from 'loader-utils';
import posthtml, { PostHTML } from 'posthtml';
import webpack from 'webpack';

type SourceType = 'src' | 'srcset';

interface TransformSrcOptions {
  url: string;
  factor: number | string;
  query: Record<string, any>;
  type: SourceType;
}

interface TransformSizesOptions {
  url: string;
  query: Record<string, any>;
}

export interface PluginOptions {
  srcAttrName: string;
  defaultDstAttr: string;
  sizesAttrName?: string;
  type: SourceType;
  medias: Array<{
    width?: { min?: number; max?: number };
    factor: number;
    alias: string;
  }>;
  transformSrcRequest?: (
    options: TransformSrcOptions,
  ) => { url: string; query: Record<string, any> } | string;
  transformSizesRequest?: (
    options: TransformSizesOptions,
  ) => { url: string; query: Record<string, any> } | string;
}

export interface Options {
  mode: 'development' | 'production';
  defaultOptions: Partial<Omit<PluginOptions, 'srcAttrName'>>;
}

function stringifyQuery(query: Record<string, any>) {
  return JSON.stringify(query).replace(/"/g, "'");
}

function parseRequest(request: string, { root }: { root?: string }) {
  const matches = request.match(/^([^?]+)(\?.*)?$/);
  const [, url, queryStr] = matches || [];

  return {
    url: root && url && /^\//.test(url) ? `${root}${url}` : url || '',
    query: (queryStr && parseQuery(queryStr)) || {},
  };
}

function _prepareSrc(
  callback: PluginOptions['transformSrcRequest'],
  { query, ...options }: TransformSrcOptions,
) {
  query = { ...query, type: options.type, factor: options.factor };
  const res = callback
    ? callback({
        ...options,
        query,
      })
    : { url: options.url, query };
  if (typeof res === 'string') {
    return res;
  }
  return `${res.url}?${stringifyQuery(res.query)}`;
}

function _prepareSizes(
  callback: PluginOptions['transformSizesRequest'],
  options: TransformSizesOptions,
) {
  const res = callback
    ? callback(options)
    : { url: options.url, query: options.query };
  if (typeof res === 'string') {
    return res;
  }
  const { url, query } = res;
  return `${url}?${stringifyQuery(query)}`;
}

function createPlugin({
  type = 'src',
  srcAttrName = 'z-src',
  defaultDstAttr = type === 'src' ? 'data-src' : 'data-srcset',
  sizesAttrName = type === 'srcset' ? 'data-sizes' : undefined,
  medias = [{ factor: 1, alias: 'default' }],
  shouldRemoveSrc = true,
  transformSrcRequest,
  transformSizesRequest,
  root,
}: Partial<PluginOptions> & { root?: string; shouldRemoveSrc?: boolean } = {}) {
  const prepareSrc = (options: TransformSrcOptions) =>
    _prepareSrc(transformSrcRequest, options);

  const prepareSrcset = (
    factors: number[],
    options: Omit<TransformSrcOptions, 'type' | 'factor'>,
  ) =>
    factors
      .map((factor) => prepareSrc({ ...options, type: 'srcset', factor }))
      .join(', ');

  const prepareSizes = (options: TransformSizesOptions) =>
    _prepareSizes(transformSizesRequest, options);

  const attrReg = new RegExp(`^${srcAttrName}(:(.*))?$`);

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

          const {
            url,
            query: { exclude, ...query },
          } = parseRequest(value, { root });
          const filteredMedias =
            exclude instanceof Array
              ? medias.filter(({ alias }) => !exclude.includes(alias))
              : medias;

          if (type === 'srcset') {
            attrs[dstAttr] = prepareSrcset(
              filteredMedias.map(({ factor }) => factor),
              { url, query },
            );
            if (sizesAttrName && typeof attrs[sizesAttrName] !== 'string') {
              attrs[sizesAttrName] = prepareSizes({
                url,
                query: { exclude, ...query },
              });
            }
          } else {
            filteredMedias.forEach(({ alias, factor }) => {
              attrs[`${dstAttr}-${alias}`] = prepareSrc({
                url,
                factor,
                query,
                type,
              });
            });
          }

          if (attr !== dstAttr) {
            attrs[attr] = shouldRemoveSrc
              ? undefined
              : prepareSrc({
                  url,
                  query,
                  type,
                  factor: filteredMedias.map(({ factor }) => factor).join('_'),
                });
          }
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

// TODO: validate options
export function createProcessor(
  conf: Array<Partial<PluginOptions>>,
  { mode, defaultOptions = {} }: Partial<Options>,
) {
  return async (html: string, loader: webpack.loader.LoaderContext) => {
    const { root } = getOptions(loader);
    const { html: htmlProcessed } = await posthtml(
      conf.map((options) =>
        createPlugin({
          ...defaultOptions,
          ...options,
          root,
          shouldRemoveSrc: (mode || loader.mode) !== 'development',
        }),
      ),
    ).process(html);
    return htmlProcessed;
  };
}
