import imagemin from 'imagemin';
import png from 'imagemin-pngquant';
import svg from 'imagemin-svgo';
import webp from 'imagemin-webp';
import { getOptions, interpolateName, parseQuery } from 'loader-utils';
import merge from 'lodash/merge';
import * as path from 'path';
import validate from 'schema-utils';
import sharp from 'sharp';
import SVGO from 'svgo';
import { compilation, loader, Logger } from 'webpack';

import schema from './options.schema';
import { formatRatio, readIfDirExists, writeFileUnder } from './utils';

interface OptionsWithAlias {
  ratios?: number[] | number;
  ratio?: number[] | number; // alias of ratios
  name?: string | ((path: string, query?: string) => string);
  type?: 'src' | 'srcset';
  esModule?: boolean;
  quality?: number;
  qualityMin?: number;
  progressive?: boolean;
  output?: string;
  input?: string;
  errorInputNotFound?: boolean;
  context?: string;
  svgoPlugins?: SVGO.PluginConfig[];
  webp?: Record<string, any>;
  webpOnly?: boolean;
  lossless?: boolean;
  noWebp?: boolean;
  noWebpIfExpanded?: boolean;
}

type Options = Omit<OptionsWithAlias, 'ratio' | 'ratios'> & {
  ratios?: number[];
};

type ImageInfo = {
  filename: string;
  content: Buffer;
  width: number;
  noCode?: boolean;
};

function resolveOptionsAlias(optionsWithAlias: OptionsWithAlias): Options {
  const { ratio, ratios = ratio, ...options } = optionsWithAlias;
  return { ratios: typeof ratios === 'number' ? [ratios] : ratios, ...options };
}

export class ImageLoader {
  static async load(
    loaderContext: loader.LoaderContext,
    source: Buffer,
  ): Promise<string> {
    try {
      const loader = new ImageLoader(loaderContext);
      const files = await loader.resize(source);
      loader.emitFiles(files);
      return loader.getCode(files.filter(({ noCode }) => !noCode));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private readonly options: Options;
  private readonly logger: Logger;

  constructor(private readonly loader: loader.LoaderContext) {
    const globalOptions = resolveOptionsAlias(getOptions(loader) || {});

    const queryOptions = resolveOptionsAlias(
      (loader.resourceQuery && parseQuery(loader.resourceQuery)) || {},
    );

    const options = merge({}, globalOptions, queryOptions);

    validate(schema, options, {
      name: ImageLoader.name,
      baseDataPath: 'options',
    });

    if (options.lossless) {
      if (options.webp) {
        options.webp.lossless = true;
      }
    }
    this.options = options;

    this.logger = (loader._compilation as compilation.Compilation).getLogger(
      ImageLoader.name,
    );
  }

  private async resize(source: Buffer): Promise<ImageInfo[]> {
    const {
      name = '[path][name]_[width]@[ratio]-[md5:contenthash:hex:6].[ext]',
      ratios = [1],
      quality = 100,
      qualityMin = quality,
      progressive = false,
      context = this.loader.rootContext,
      errorInputNotFound = false,
      output,
      input,
      webp: webpOptions,
      webpOnly = false,
      noWebp = false,
      noWebpIfExpanded = false,
    } = this.options;

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
    if (!format || (format !== 'svg' && !oriWidth)) {
      throw new Error('Unsupported image');
    }

    if (format === 'svg') {
      const plugins = [
        { removeViewBox: false },
        ...(this.options.svgoPlugins || []),
      ];
      const content = await imagemin.buffer(source, {
        plugins: [svg({ plugins })],
      });
      const width = oriWidth || 1;
      return [
        {
          content,
          width,
          filename: interpolateName(this.loader, name as any, {
            content,
            context,
          })
            .replace('[width]', width.toString())
            .replace('[ratio]', formatRatio(1)),
        },
      ];
    }

    const filename = interpolateName(
      this.loader,
      `[path][name].[ext]/[sha1:contenthash:hex:24]/${qualityMin}-${quality}.[ext]`,
      { content: source, context },
    );
    const parsed = path.parse(filename);
    const inputDir = input && path.resolve(input, parsed.dir, parsed.name);
    const outputDir = output && path.resolve(output, parsed.dir, parsed.name);

    let pngPlugin: ReturnType<typeof png> | undefined;
    if (format === 'png' && quality <= 100) {
      pngPlugin = png({
        quality: [qualityMin / 100, quality / 100],
        strip: true,
      });
    }

    const resizeAndCompress = async (
      ratio: number,
      { toWebP = false, filename = '' } = {},
    ): Promise<ImageInfo> => {
      const width = Math.ceil((oriWidth as number) * ratio);
      const ratioStr = formatRatio(ratio);

      const tempName = `${ratioStr}${parsed.ext}${toWebP ? '.webp' : ''}`;
      let content = await readIfDirExists(tempName, inputDir);

      if (!content) {
        if (errorInputNotFound) {
          throw new Error(
            `${tempName} not found under input directory: ${inputDir}`,
          );
        }

        const resized = img.clone().resize({ width });
        const compressed = toWebP
          ? await imagemin.buffer(await resized.toBuffer(), {
              plugins: [webp({ ...(webpOptions || {}), quality })],
            })
          : !pngPlugin
          ? await resized.jpeg({ quality, progressive }).toBuffer()
          : await imagemin.buffer(await resized.toBuffer(), {
              plugins: [pngPlugin],
            });

        if (outputDir && (!content || outputDir !== inputDir)) {
          await writeFileUnder(outputDir, tempName, compressed);
        }
        content = compressed;
      } else {
        this.logger.log(
          `Load the preprocessed image: ${path.resolve(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            inputDir!,
            tempName,
          )}`,
        );
      }

      if (!filename) {
        // interpolateName 的类型声明有误，name 应当可以是 function 的
        filename = interpolateName(this.loader, name as any, {
          content,
          context,
        })
          .replace('[width]', width.toString())
          .replace('[ratio]', formatRatio(ratio));
        if (toWebP) {
          filename += '.webp';
        }
      }
      return {
        filename,
        width,
        content,
      };
    };

    const images: ImageInfo[] = [];
    await Promise.all(
      ratios
        .filter((ratio) => ratio > 0 && ratio <= 1)
        .map(async (ratio) => {
          // TODO: 重复执行了 resize 操作，应该可以优化——使用 srcset
          const imageWebP = await resizeAndCompress(ratio, { toWebP: true });
          images.push(imageWebP);

          if (!webpOnly) {
            const image = await resizeAndCompress(ratio, {
              toWebP: false,
              filename: imageWebP.filename.replace(/\.webp$/i, ''),
            });
            images.push(image);

            if (
              noWebp ||
              (noWebpIfExpanded &&
                image.content.byteLength < imageWebP.content.byteLength)
            ) {
              image.noCode = false;
              imageWebP.noCode = true;
            } else {
              image.noCode = true;
            }
          }
        }),
    );
    return images;
  }

  private emitFiles(files: ImageInfo[]) {
    files.forEach(({ filename, content }) => {
      this.loader.emitFile(filename, content, undefined);
      this.logger.status(`file emitted: ${filename}`);
    });
  }

  private getCode(files: ImageInfo[]) {
    const code =
      (this.options.esModule ? 'export default ' : 'module.exports = ') +
      files
        .map(({ filename, width }) => {
          let code = `__webpack_public_path__ + ${JSON.stringify(filename)}`;
          if (this.options.type === 'srcset') {
            code += ` + ' ${width}w'`;
          }
          return code;
        })
        .join(' + ", " + ');

    return code;
  }
}
