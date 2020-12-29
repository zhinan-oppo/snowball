export default {
  definitions: {
    Medias: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        required: ['ratio'],
        properties: {
          ratio: {
            type: 'number' as const,
            min: 0,
            max: 1,
          },
          width: {
            type: 'object' as const,
            properties: {
              min: {
                type: 'number' as const,
                min: 0,
              },
              max: {
                type: 'number' as const,
                min: 0,
              },
            },
          },
        },
      },
    },
  },
  additionalProperties: true,
  type: 'object' as const,
  required: ['medias'],
  properties: {
    esModule: {
      description:
        'By default, responsive-image-loader generates JS modules that use the ES modules syntax.',
      type: 'boolean' as const,
    },
    baseRatio: {
      type: 'number' as const,
      min: 0,
    },
    medias: {
      description: 'Breakpoint settings',
      type: 'object' as const,
      properties: {
        default: { $ref: '#/definitions/Medias' },
      },
      additionalProperties: {
        $ref: '#/definitions/Medias',
      },
    },
    presets: {
      type: 'object' as const,
      additionalProperties: {
        type: 'string' as const,
      },
    },
  },
};
