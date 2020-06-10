export default {
  definitions: {
    Ratio: {
      description: 'The ratio to scale images',
      type: 'number' as 'number',
      min: 0,
      max: 1,
    },
  },
  additionalProperties: true,
  type: 'object' as 'object',
  properties: {
    name: {
      description:
        'The filename template for the target file(s) (https://github.com/webpack-contrib/file-loader#name).',
      type: 'string' as 'string',
    },
    esModule: {
      description:
        'By default, image-loader generates JS modules that use the ES modules syntax.',
      type: 'boolean' as 'boolean',
    },
    ratios: {
      type: 'array' as 'array',
      minLength: 1,
      items: {
        $ref: '#/definitions/Ratio',
      },
    },
    type: {
      enum: ['src', 'srcset'],
    },
    quality: {
      type: 'number' as 'number',
      min: 50,
      max: 100,
    },
    qualityMin: {
      type: 'number' as 'number',
      min: 50,
      max: 100,
    },
    progressive: {
      type: 'boolean' as 'boolean',
    },
    output: {
      type: 'string' as 'string',
    },
    input: {
      type: 'string' as 'string',
    },
    errorInputNotFound: {
      type: 'boolean' as 'boolean',
    },
    context: {
      type: 'string' as 'string',
    },
  },
};
