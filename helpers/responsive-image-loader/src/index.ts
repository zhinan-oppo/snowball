import { getOptions, interpolateName, parseQuery } from 'loader-utils';
import { parse as parsePath } from 'path';
import validate from 'schema-utils';
import sharp from 'sharp';
import { compilation, loader, Logger } from 'webpack';

import schema from './options.schema';

interface Options {
  factors?: number[];
  name?: string;
  esModule?: boolean;
  output?: {
    jpeg?: object;
    png?: object;
    webp?: object;
    gif?: object;
    svg?: object;
  };
}

const LOADER_NAME = 'ResponsiveImageLoader';

async function scaleAndEmitImages(
  loader: loader.LoaderContext,
  source: Buffer | string,
  {
    name = '[contenthash].[ext]',
    factors = [],
    output,
    outputOptions,
  }: Options & { outputOptions?: object } = {},
  logger: typeof console | Logger = console,
) {
  const url = interpolateName(loader, name, {
    context: loader.rootContext,
    content: source,
  });
  const img = sharp(source);
  const meta = await img.metadata();
  const oriWidth = meta.width;
  const format = meta.format as
    | 'jpeg'
    | 'png'
    | 'webp'
    | 'gif'
    | 'svg'
    | undefined;
  if (!oriWidth || !format) {
    throw new Error('Unsupported image');
  }
  logger.log({ format, width: oriWidth, factors, outputOptions });

  if (output && format && output[format]) {
    outputOptions = Object.assign({}, output[format], outputOptions);
  }
  img.toFormat(format, outputOptions);
  const { name: oriName, ext, dir } = parsePath(url);
  return Promise.all(
    factors.map(async (factor) => {
      const width = Math.round(oriWidth * factor);
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
  const { factors, name, esModule: es, ...queries } =
    (this.resourceQuery && parseQuery(this.resourceQuery)) || {};
  options.factors = factors || options.factors;
  options.name = name || options.name;
  options.esModule = typeof es === 'boolean' ? es : options.esModule;
  validate(schema, options, {
    name: LOADER_NAME,
    baseDataPath: 'options',
  });

  const { esModule = true, ...rest } = options;
  scaleAndEmitImages(
    this,
    this.resourcePath,
    { ...rest, outputOptions: queries },
    logger,
  )
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
