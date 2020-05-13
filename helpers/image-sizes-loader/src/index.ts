import { imageSize } from 'image-size';
import { getOptions, parseQuery } from 'loader-utils';
import validate from 'schema-utils';
import { loader } from 'webpack';

import { getMediaQuery, Media } from '@zhinan-oppo/shared';

import schema from './options.schema';

type Medias = Array<{
  factor: number;
  width?: { min?: number; max?: number };
  orientation?: Media['orientation'];
  alias?: string;
}>;

interface Options {
  esModule?: boolean;
  medias: Medias | { default: Medias; [name: string]: Medias };
}

const LOADER_NAME = 'ImageSizesLoader';

export const raw = true;
export default function(this: loader.LoaderContext) {
  if (this.cacheable) {
    this.cacheable(true);
  }

  const { medias: rawMedias, ...restOptions } = getOptions(this) as Options;
  const options = {
    ...restOptions,
    medias: rawMedias instanceof Array ? { default: rawMedias } : rawMedias,
  };
  const query = (this.resourceQuery && parseQuery(this.resourceQuery)) || {};
  options.esModule =
    typeof query.esModule === 'boolean' ? query.esModule : options.esModule;
  validate(schema, options, {
    name: LOADER_NAME,
    baseDataPath: 'options',
  });

  const { esModule = true, medias } = options;
  const media: string = query.media || 'default';
  if (!medias[media]) {
    throw new Error(`Invalid query options: {media:${media}}`);
  }
  const exclude: string[] = query.exclude instanceof Array ? query.exclude : [];
  const { width: oriWidth } = imageSize(this.resourcePath) || {};
  const maxFactor = medias[media].reduce(
    (max, { factor }) => Math.max(max, factor),
    0,
  );
  const code =
    typeof oriWidth === 'number'
      ? medias[media]
          .filter(
            ({ alias, factor }) =>
              factor > 0 && !(alias && exclude.includes(alias)),
          )
          .map((media) => {
            const { factor, width, orientation } = media;
            const w = `${Math.round(oriWidth * (factor / maxFactor))}px`;
            const query = getMediaQuery({ width, orientation });
            return query ? `${query} ${w}` : w;
          })
          .join(', ')
      : '';
  return `${esModule ? 'export default' : 'module.exports ='} '${code}';`;
}
