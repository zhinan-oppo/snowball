import { getOptions, interpolateName } from 'loader-utils';
import { parse as parsePath } from 'path';
import validate from 'schema-utils';
import sharp from 'sharp';
import { compilation, loader, Logger } from 'webpack';

import schema from './options.schema';

interface Options {
  factors?: number[];
  name?: string;
  esModule?: boolean;
}

const LOADER_NAME = 'ResponsiveImageLoader';

async function scaleAndEmitImages(
  loader: loader.LoaderContext,
  source: Buffer | string,
  {
    name = '[contenthash].[ext]',
    factors = [],
  }: Omit<Options, 'esModule'> = {},
  logger: typeof console | Logger = console,
) {
  const url = interpolateName(loader, name, {
    context: loader.rootContext,
    content: source,
  });
  const img = sharp(source);
  const { width: originWidth, height } = await img.metadata();
  if (!originWidth || !height) {
    throw new Error('Unsupported image');
  }
  logger.log({ width: originWidth, height, factors });
  const { name: oriName, ext, dir } = parsePath(url);
  return Promise.all(
    factors.map(async (factor) => {
      const width = Math.round(originWidth * factor);
      const resized = await img
        .clone()
        .resize({ width })
        .toBuffer();
      const filename = `${dir}/${oriName}_${width}${ext}`;
      loader.emitFile(filename, resized, undefined);
      logger.log(`${filename} emitted`);

      return { filename, width };
    }),
  );
}

export const raw = true;
export default function(this: loader.LoaderContext) {
  if (this.cacheable) {
    this.cacheable(true);
  }

  const callback = this.async();
  if (!callback) {
    return this.emitError(`async() failed`);
  }
  const logger = (this._compilation as compilation.Compilation).getLogger(
    LOADER_NAME,
  );

  const options = (getOptions(this) as Options) || {};
  validate(schema, options, {
    name: LOADER_NAME,
    baseDataPath: 'options',
  });

  const { esModule = true, ...rest } = options;
  scaleAndEmitImages(this, this.resourcePath, rest, logger)
    .then((res) => {
      const code = `${JSON.stringify(res)}.map(
        ({ filename, width }) => __webpack_public_path__ + filename + ' ' + width + 'w',
      ).join(', ')`;
      callback(
        null,
        esModule ? `export default ${code}` : `module.exports = ${code}`,
      );
    })
    .catch((e) => {
      logger.error(e);
      callback(e);
    });
}
