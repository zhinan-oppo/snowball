export default {
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
  },
};
