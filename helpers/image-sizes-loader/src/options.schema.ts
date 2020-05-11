export default {
  definitions: {
    Medias: {
      type: 'array' as 'array',
      items: {
        type: 'object' as 'object',
        required: ['factor'],
        properties: {
          factor: {
            type: 'number' as 'number',
            min: 1e-3,
            max: 1,
          },
          width: {
            type: 'object' as 'object',
            properties: {
              min: {
                type: 'number' as 'number',
                min: 0,
              },
              max: {
                type: 'number' as 'number',
                min: 0,
              },
            },
          },
        },
      },
    },
  },
  additionalProperties: true,
  type: 'object' as 'object',
  required: ['medias'],
  properties: {
    esModule: {
      description:
        'By default, responsive-image-loader generates JS modules that use the ES modules syntax.',
      type: 'boolean' as 'boolean',
    },
    medias: {
      description: 'Breakpoint settings',
      type: 'object' as 'object',
      properties: {
        default: { $ref: '#/definitions/Medias' },
      },
      additionalProperties: {
        $ref: '#/definitions/Medias',
      },
    },
  },
};
