import { getOptions, parseQuery } from 'loader-utils';
import posthtml, { PostHTML } from 'posthtml';
import { loader } from 'webpack';

type SourceType = 'src' | 'srcset';

interface PrepareURLOptions {
  url: string;
  factor: number | string;
  query: Record<string, any>;
  attr: string;
  type: SourceType;
}

interface PrepareSizesOptions {
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
  prepareURL?: (
    options: PrepareURLOptions,
  ) => { url: string; query: Record<string, any> } | string;
  prepareSizes?: (
    options: PrepareSizesOptions,
  ) => { url: string; query: Record<string, any> } | string;
}

export interface Options {
  mode: 'development' | 'production';
  defaultOptions: Partial<Omit<PluginOptions, 'srcAttrName'>>;
}

function stringifyQuery(query: Record<string, any>) {
  return JSON.stringify(query).replace(/"/g, "'");
}

function createPlugin({
  type = 'src',
  srcAttrName = 'z-src',
  defaultDstAttr = type === 'src' ? 'data-src' : 'data-srcset',
  sizesAttrName = type === 'srcset' ? 'data-sizes' : undefined,
  medias = [{ factor: 1, alias: 'default' }],
  shouldRemoveSrc = true,
  prepareURL: _prepareURL,
  prepareSizes: _prepareSizes,
  root,
}: Partial<PluginOptions> & { root?: string; shouldRemoveSrc?: boolean } = {}) {
  const prepareURL = ({ query, ...options }: PrepareURLOptions) => {
    query = { ...query, type: options.type, factor: options.factor };
    const res = _prepareURL
      ? _prepareURL({
          ...options,
          query,
        })
      : { url: options.url, query };
    if (typeof res === 'string') {
      return res;
    }
    return `${res.url}?${stringifyQuery(res.query)}`;
  };
  const prepareSizes = (options: PrepareSizesOptions) => {
    const res = _prepareSizes
      ? _prepareSizes(options)
      : { url: options.url, query: options.query };
    if (typeof res === 'string') {
      return res;
    }
    const { url, query } = res;
    return `${url}?${stringifyQuery(query)}`;
  };

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

          const resourceMatches = value.match(/^([^?]+)(\?.*)?$/);
          let url = (resourceMatches && resourceMatches[1]) || '';
          if (root && /^\//.test(url)) {
            url = `${root}${url}`;
          }

          const queryStr = resourceMatches && resourceMatches[2];
          const { exclude, ...query } =
            (queryStr && parseQuery(queryStr)) || {};
          const mediaExclude: string[] =
            (exclude instanceof Array && exclude) || [];
          const filteredMedias = medias.filter(
            ({ alias }) => !mediaExclude.includes(alias),
          );

          if (type === 'srcset') {
            attrs[dstAttr] = filteredMedias
              .map(({ factor }) => factor)
              .map((factor) => prepareURL({ url, factor, attr, query, type }))
              .join(', ');
            if (sizesAttrName && typeof attrs[sizesAttrName] !== 'string') {
              attrs[sizesAttrName] = prepareSizes({
                url,
                query: { exclude, ...query },
              });
            }
          } else {
            filteredMedias.forEach(({ alias, factor }) => {
              attrs[`${dstAttr}-${alias}`] = prepareURL({
                url,
                factor,
                attr,
                query,
                type,
              });
            });
          }

          if (attr !== dstAttr) {
            attrs[attr] = shouldRemoveSrc
              ? undefined
              : prepareURL({
                  url,
                  attr,
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
  return async (html: string, loader: loader.LoaderContext) => {
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
