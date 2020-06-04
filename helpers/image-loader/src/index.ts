import imagemin from 'imagemin';
import jpeg from 'imagemin-mozjpeg';
import png from 'imagemin-pngquant';
import { getOptions, interpolateName, parseQuery } from 'loader-utils';
import validate from 'schema-utils';
import sharp from 'sharp';
import { compilation, loader, Logger } from 'webpack';
import * as path from 'path';
import * as stdFS from 'fs';

import schema from './options.schema';

interface Options {
  ratios?: number[];
  name?: string;
  type?: 'src' | 'srcset';
  esModule?: boolean;
  quality?: number;
  qualityMin?: number;
  progressive?: boolean;
  cacheDir?: string;
  context?: string;
}

const LOADER_NAME = 'ImageLoader';

async function resize(
  source: Buffer | string,
  ratios = [1],
  logger: typeof console | Logger = console,
) {
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
  logger.log({
    source: typeof source === 'string' ? source : 'Buffer',
    format,
    width: oriWidth,
    ratios,
  });
  if (format === 'jpeg') {
    img.jpeg({ quality: 100 });
  }

  return {
    format,
    images: ratios
      .filter((ratio) => ratio > 0 && ratio <= 1)
      .map(async (ratio) => {
        const width = Math.ceil(oriWidth * ratio);
        const content = await img.resize({ width }).toBuffer();
        return { content, format, width, ratio };
      }),
  };
}

export const raw = true;
export default async function(
  this: loader.LoaderContext,
  source?: Buffer,
  result?: string,
  ...files: Array<{ filename: string; content: Buffer }>
) {
  const logger = (this._compilation as compilation.Compilation).getLogger(
    LOADER_NAME,
  );

  const emitFiles = (
    loader: loader.LoaderContext,
    files: Array<{ filename: string; content: Buffer }>,
  ) => {
    files.forEach(({ filename, content }) => {
      loader.emitFile(filename, content, undefined);
      logger.status(`file emitted: ${filename}`);
    });
  };

  /**
   * 通过重复 loader 使得 cache-loader 可以缓存 emitFile 的文件
   */
  if (!source) {
    emitFiles(this, files);
    return result;
  }

  if (this.cacheable) {
    this.cacheable(true);
  }

  const callback = this.async() as Function;
  if (!callback) {
    throw new Error('async() failed');
  }

  const { cacheDir, context, ...options } = (getOptions(this) as Options) || {};
  const {
    ratios = options.ratios,
    name = options.name,
    type = options.type,
    esModule = options.esModule,
    quality = options.quality || 100,
    progressive = options.progressive || true,
    qualityMin = options.qualityMin || 70,
  } = (this.resourceQuery && parseQuery(this.resourceQuery)) || {};

  validate(
    schema,
    {
      ratios,
      name,
      type,
      esModule,
      cacheDir,
    },
    {
      name: LOADER_NAME,
      baseDataPath: 'options',
    },
  );

  let resFiles: any[] = [];
  const fs = (this.fs || stdFS) as typeof stdFS;
  /**
   * FIXME
   */
  if (cacheDir && stdFS.existsSync(cacheDir)) {
    const filename = interpolateName(this, '[path]/[name].[ext]', {
      context: context || this.rootContext,
    });
    const parsed = path.parse(filename);
    const dir = path.resolve(cacheDir, parsed.dir);
    const filenames = fs.readdirSync(dir);
    resFiles = await Promise.all(
      ratios.map(async (ratio: number) => {
        const nameWithRatio = new RegExp(
          `^${parsed.name}_\\d+@${ratio
            .toString()
            .replace('0.', 'd')}-.*${parsed.ext.replace('.', '')}$`,
        );
        for (const filename of filenames) {
          if (nameWithRatio.test(filename)) {
            logger.info(`matched: ${dir}/${filename}`);
            const content = fs.readFileSync(path.resolve(dir, filename));
            try {
              const { width } = await sharp(content).metadata();
              return {
                width,
                content,
                filename: interpolateName(
                  this,
                  name
                    .replace('[width]', width)
                    .replace('[ratio]', ratio.toString().replace('0.', 'd')),
                  {
                    content,
                    context: this.rootContext,
                  },
                ),
              };
            } catch (e) {
              logger.error(e);
            }
          }
        }
        logger.warn(`not found: ${nameWithRatio}`);
      }),
    );
    resFiles = resFiles.filter(Boolean);
  } else {
    try {
      const { format, images } = await resize(source, ratios, logger);
      const plugins =
        quality < 100 && ['png', 'jpeg'].includes(format)
          ? format === 'png'
            ? [png({ quality: [qualityMin / 100, quality / 100], strip: true })]
            : [jpeg({ quality, progressive })]
          : undefined;
      resFiles = await Promise.all(
        images.map(async (p) => {
          const { content, width, ratio } = await p;
          const filename = interpolateName(
            this,
            name
              .replace('[width]', width)
              .replace('[ratio]', ratio.toString().replace('0.', 'd')),
            {
              content,
              context: this.rootContext,
            },
          );
          const resBuffer = !plugins
            ? content
            : await imagemin.buffer(content, { plugins });
          return { filename, width, content: resBuffer };
        }),
      );
    } catch (e) {
      logger.error(e);
      return callback(e);
    }
  }
  const res =
    (esModule ? 'export default ' : 'module.exports = ') +
    resFiles
      .map(({ filename, width }) => {
        let code = `__webpack_public_path__ + ${JSON.stringify(filename)}`;
        if (type === 'srcset') {
          code += ` + ' ${width}w'`;
        }
        return code;
      })
      .join(' + ", " + ');

  if (this.loaderIndex === 0) {
    /** 没有使用缓存，直接 emitFile */
    emitFiles(this, files);
    return callback(undefined, res);
  }

  callback(undefined, undefined, res, ...(resFiles as any));
}
