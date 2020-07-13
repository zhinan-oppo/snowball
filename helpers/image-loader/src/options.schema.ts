export default {
  definitions: {
    Ratio: {
      description: 'The ratio to scale images',
      type: 'number' as const,
      min: 0,
      max: 1,
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
    ratios: {
      type: 'array' as const,
      minLength: 1,
      items: {
        $ref: '#/definitions/Ratio',
      },
    },
    type: {
      enum: ['src', 'srcset'],
    },
    quality: {
      type: 'number' as const,
      min: 50,
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
  },
};
