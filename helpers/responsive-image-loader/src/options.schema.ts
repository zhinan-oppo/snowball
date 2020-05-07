export default {
  additionalProperties: true,
  type: 'object' as 'object',
  required: ['factors'],
  properties: {
    name: {
      description:
        'The filename template for the target file(s) (https://github.com/webpack-contrib/file-loader#name).',
      type: 'string' as 'string',
    },
    esModule: {
      description:
        'By default, responsive-image-loader generates JS modules that use the ES modules syntax.',
      type: 'boolean' as 'boolean',
    },
    factors: {
      description: 'Factors to scale images',
      type: 'array' as 'array',
      items: {
        type: 'number' as 'number',
      },
      minItems: 1,
      uniqueItems: true,
    },
    output: {
      type: 'object' as 'object',
      additionalProperties: true,
      properties: {
        jpeg: {
          type: 'object' as 'object',
          additionalProperties: true,
          properties: {
            quality: {
              type: 'number' as 'number',
              min: 1,
              max: 100,
            },
            progressive: {
              type: 'boolean' as 'boolean',
            },
          },
        },
        png: {
          type: 'object' as 'object',
          additionalProperties: true,
          properties: {
            quality: {
              type: 'number' as 'number',
              min: 1,
              max: 100,
            },
            progressive: {
              type: 'boolean' as 'boolean',
            },
          },
        },
      },
    },
  },
};
