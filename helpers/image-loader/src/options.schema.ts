export default {
  definitions: {
    Ratio: {
      description: 'The ratio to scale images',
      type: 'number' as const,
      min: 0,
      max: 1,
    },
    Ratios: {
      description: 'The ratio(s) to scale images',
      anyOf: [
        { $ref: '#/definitions/Ratio' },
        {
          type: 'array' as const,
          minLength: 1,
          items: {
            $ref: '#/definitions/Ratio',
          },
        },
      ],
    },
  },
  additionalProperties: true,
  type: 'object' as const,
  properties: {
    name: {
      description:
        'The filename template for the target file(s) (https://github.com/webpack-contrib/file-loader#name).',
      oneOf: [{ type: 'string' as const }, { instanceof: 'Function' as const }],
    },
    esModule: {
      description:
        'By default, image-loader generates JS modules that use the ES modules syntax.',
      type: 'boolean' as const,
    },
    ratios: { $ref: '#/definitions/Ratios' },
    ratio: { $ref: '#/definitions/Ratios' },
    type: {
      enum: ['src', 'srcset'],
    },
    quality: {
      type: 'number' as const,
      min: 50,
      max: 100,
    },
    qualityRaw: {
      description: '压缩得到的 jpg/png 质量，默认同 quality',
      type: 'number' as const,
      min: 10,
      max: 100,
    },
    qualityMin: {
      type: 'number' as const,
      min: 50,
      max: 100,
    },
    progressive: {
      type: 'boolean' as const,
    },
    output: {
      type: 'string' as const,
    },
    input: {
      type: 'string' as const,
    },
    errorInputNotFound: {
      type: 'boolean' as const,
    },
    context: {
      type: 'string' as const,
    },
    svgoPlugins: {
      description: 'https://github.com/svg/svgo#what-it-can-do',
      type: 'array' as const,
      items: {
        type: 'object' as const,
        additionalProperties: true,
      },
    },
    webp: {
      description: 'https://github.com/imagemin/imagemin-webp#options',
      type: 'object' as const,
      additionalProperties: true,
    },
    webpOnly: {
      description: 'Output WebP images only.',
      type: 'boolean' as const,
    },
    lossless: {
      description: 'Use lossless WebP and high quality JPEG/PNG',
      type: 'boolean' as const,
    },
    noWebp: {
      description: "Don't use WebP format",
      type: 'boolean' as const,
    },
    noWebpIfExpanded: {
      description:
        "Don't use WebP format if transformed WebP file size is larger",
      type: 'boolean' as const,
    },
  },
};
