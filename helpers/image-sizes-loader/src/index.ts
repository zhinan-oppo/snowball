import { imageSize } from 'image-size';
import { getOptions, parseQuery } from 'loader-utils';
import validate from 'schema-utils';
import { loader } from 'webpack';

import { getMediaQuery, Media } from '@zhinan-oppo/shared';

import schema from './options.schema';

type Medias = Array<{
  ratio: number;
  width?: { min?: number; max?: number };
  orientation?: Media['orientation'];
  alias?: string;
}>;

interface Options {
  esModule?: boolean;
  baseRatio?: number;
  medias: Medias | { default: Medias; [name: string]: Medias };
  presets: { [alias: string]: string };
}

const LOADER_NAME = 'ImageSizesLoader';

export const raw = true;
export default function (this: loader.LoaderContext): string {
  if (this.cacheable) {
    this.cacheable(true);
  }

  const {
    medias: rawMedias,
    baseRatio: defaultBaseRatio = 1,
    presets: defaultPresets = {},
    ...restOptions
  } = getOptions(this) as Options;
  const options = {
    ...restOptions,
    baseRatio: defaultBaseRatio,
    presets: defaultPresets,
    medias: rawMedias instanceof Array ? { default: rawMedias } : rawMedias,
  };
  const query = (this.resourceQuery && parseQuery(this.resourceQuery)) || {};
  if (typeof query.esModule === 'boolean') {
    options.esModule = query.esModule;
  }
  if (typeof query.baseRatio === 'number') {
    options.baseRatio = query.baseRatio;
  }
  if (typeof query.presets === 'object') {
    options.presets = query.presets;
  }
  validate(schema, options, {
    name: LOADER_NAME,
    baseDataPath: 'options',
  });

  const { esModule = true, medias, baseRatio, presets } = options;
  const media: string = query.media || 'default';
  if (!medias[media]) {
    throw new Error(`Invalid query options: {media:${media}}`);
  }
  const exclude: string[] = query.exclude instanceof Array ? query.exclude : [];
  const { width: oriWidth } = imageSize(this.resourcePath) || {};
  const code =
    typeof oriWidth === 'number'
      ? medias[media]
          .filter(
            ({ alias, ratio }) =>
              ratio > 0 && !(alias && exclude.includes(alias)),
          )
          .map(({ ratio, width, orientation, alias }) => {
            const w =
              (alias && presets[alias]) ||
              `${Math.ceil((oriWidth / baseRatio) * ratio)}px`;
            const query = getMediaQuery({ width, orientation });
            return query ? `${query} ${w}` : w;
          })
          .join(', ')
      : '';
  return `${esModule ? 'export default' : 'module.exports ='} '${code}';`;
}
