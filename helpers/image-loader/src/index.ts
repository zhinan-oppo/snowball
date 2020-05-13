import { getOptions, interpolateName, parseQuery } from 'loader-utils';
import { parse as parsePath, posix } from 'path';
import validate from 'schema-utils';
import sharp from 'sharp';
import { compilation, loader, Logger } from 'webpack';

import schema from './options.schema';

interface Options {
  ratio?: number;
  name?: string;
  type?: 'src' | 'srcset';
  esModule?: boolean;
  output?: {
    jpeg?: object;
    png?: object;
    webp?: object;
    gif?: object;
    svg?: object;
  };
}

const LOADER_NAME = 'ImageLoader';

async function scaleAndEmitImage(
  loader: loader.LoaderContext,
  source: Buffer | string,
  {
    name = '[contenthash].[ext]',
    ratio = 1,
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
  logger.log({ format, width: oriWidth, ratio, outputOptions });

  if (output && format && output[format]) {
    outputOptions = Object.assign({}, output[format], outputOptions);
  }
  img.toFormat(format, outputOptions);
  const { name: oriName, ext, dir } = parsePath(url);

  const width = Math.round(oriWidth * ratio);
  const resized = await img.resize({ width }).toBuffer();
  const filename = posix.join(dir, `${oriName}_${width}${ext}`);
  loader.emitFile(filename, resized, undefined);
  logger.log(`${filename} emitted`);

  return { filename, width };
}

export const raw = true;
export default function(this: loader.LoaderContext) {
  if (this.cacheable) {
    this.cacheable(true);
  }

  const callback = this.async();
  if (!callback) {
    throw new Error('async() failed');
  }
  const logger = (this._compilation as compilation.Compilation).getLogger(
    LOADER_NAME,
  );

  const options = (getOptions(this) as Options) || {};
  const {
    ratio: ratioStr = options.ratio,
    name = options.name,
    type = options.type,
    esModule = options.esModule,
    ...queries
  } = (this.resourceQuery && parseQuery(this.resourceQuery)) || {};
  const ratio = parseFloat(ratioStr);
  validate(schema, options, {
    name: LOADER_NAME,
    baseDataPath: 'options',
  });

  scaleAndEmitImage(
    this,
    this.resourcePath,
    { ratio, name, type, outputOptions: queries },
    logger,
  )
    .then(({ filename, width }) => {
      let code = `__webpack_public_path__ + ${JSON.stringify(filename)}`;
      if (type === 'srcset') {
        code += ` + ' ${width}w'`;
      }

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
