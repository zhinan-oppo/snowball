import { getOptions, parseQuery } from 'loader-utils';
import posthtml, { PostHTML } from 'posthtml';
import webpack from 'webpack';
import { fixNumber } from './util';

type SourceType = 'src' | 'srcset';

interface TransformSrcOptions {
  url: string;
  ratios: number[];
  query: Record<string, any>;
  type: SourceType;
}

interface TransformSizesOptions {
  url: string;
  query: Record<string, any>;
}

export interface PluginOptions {
  /** default to 1 */
  baseRatio: number;
  /** e.g. '@src' */
  srcAttrName: string;
  /** e.g. 'data-srcset' */
  defaultDstAttr: string;
  /** e.g. 'data-sizes' */
  sizesAttrName?: string;
  type: SourceType;
  medias: Array<{
    width?: { min?: number; max?: number };
    ratio: number;
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
  query = { ...query, type: options.type, ratios: options.ratios };
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
  baseRatio: defaultBaseRatio = 1,
  type = 'src',
  srcAttrName = 'z-src',
  defaultDstAttr = type === 'src' ? 'data-src' : 'data-srcset',
  sizesAttrName = type === 'srcset' ? 'data-sizes' : undefined,
  medias = [{ ratio: 1, alias: 'default' }],
  shouldRemoveSrc = true,
  transformSrcRequest,
  transformSizesRequest,
  root,
}: Partial<PluginOptions> & { root?: string; shouldRemoveSrc?: boolean } = {}) {
  const prepareSrc = (options: TransformSrcOptions) =>
    _prepareSrc(transformSrcRequest, options);

  const prepareSrcset = (
    ratios: number[],
    options: Omit<TransformSrcOptions, 'type' | 'ratios'>,
  ) => prepareSrc({ ...options, ratios, type: 'srcset' });

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
          const filteredMedias = medias.filter(
            ({ alias, ratio }) =>
              ratio > 0 &&
              !(exclude instanceof Array && exclude.includes(alias)),
          );
          const maxRatio = filteredMedias.reduce(
            (max, { ratio }) => Math.max(max, ratio),
            0,
          );

          const baseRatio: number = query.baseRatio || defaultBaseRatio;
          if (type === 'srcset') {
            const ratios = new Set<number>(
              filteredMedias.map(({ ratio }) => fixNumber(ratio / baseRatio)),
            );
            for (let scale = baseRatio; scale > maxRatio; scale -= 1) {
              ratios.add(fixNumber(scale / baseRatio));
            }
            Array.from(ratios).forEach((ratio) => {
              ratios.add(fixNumber(ratio / 2));
            });

            attrs[dstAttr] = prepareSrcset(Array.from(ratios).sort(), {
              url,
              query,
            });
            if (
              sizesAttrName &&
              typeof attrs[sizesAttrName] !== 'string' &&
              typeof attrs.sizes !== 'string'
            ) {
              const sizePresets: { [alias: string]: string } = {};
              Object.keys(attrs).forEach((attr) => {
                const value = attrs[attr];
                const matches = attr.match(/^@sizes:(\S+)/);
                if (matches && matches[1] && value) {
                  matches[1].split('.').forEach((alias) => {
                    if (alias) {
                      sizePresets[alias] = value;
                    }
                  });
                  if (shouldRemoveSrc) {
                    attrs[attr] = undefined;
                  }
                }
              });
              attrs[sizesAttrName] = prepareSizes({
                url,
                query: { exclude, baseRatio, presets: sizePresets, ...query },
              });
            }
          } else {
            filteredMedias.forEach(({ alias, ratio }) => {
              attrs[`${dstAttr}-${alias}`] = prepareSrc({
                url,
                query,
                type,
                ratios: [ratio / baseRatio],
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
                  ratios: filteredMedias.map(({ ratio }) => ratio),
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

type SrcAttrName = string;
// TODO: validate options
export function createProcessor(
  {
    default: defaultOptions = {},
    ...options
  }: Record<SrcAttrName, Partial<Omit<PluginOptions, 'srcAttrName'>>>,
  { mode = 'production' }: Partial<Options> = {},
): (html: string, loader: webpack.loader.LoaderContext) => Promise<string> {
  const conf = Object.entries(options).map(([srcAttrName, item]) => ({
    ...item,
    srcAttrName,
  }));
  return async (html, loader) => {
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
