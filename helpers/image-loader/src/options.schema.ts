export default {
  definitions: {
    Factor: {
      description: 'The factor to scale images',
      type: 'number' as 'number',
      min: 1e-3,
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
    factor: {
      $ref: '#/definitions/Factor',
    },
    type: {
      enum: ['src', 'srcset'],
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
