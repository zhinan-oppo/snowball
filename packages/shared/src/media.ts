import { WindowSize } from './windowSize';

export interface Media {
  width: { min: number } | { max: number };
  orientation?: 'portrait' | 'landscape';
  alias: string;
}

export function isMinWidth(width: Media['width']): width is { min: number } {
  return typeof (width as { min: number }).min === 'number';
}

export function isMaxWidth(width: Media['width']): width is { max: number } {
  return !isMinWidth(width);
}

export function matchMedia(
  medias: Media[],
  { width: windowWidth, height: windowHeight } = WindowSize.getSize(),
): Media | undefined {
  const windowOrientation =
    windowWidth > windowHeight ? 'landscape' : 'portrait';
  for (let i = 0; i < medias.length; i += 1) {
    const media = medias[i];
    const { width, orientation } = media;

    if (!orientation || orientation === windowOrientation) {
      if (isMinWidth(width)) {
        if (windowWidth >= width.min) {
          return media;
        }
      } else {
        if (windowWidth <= width.max) {
          return media;
        }
      }
    }
  }
}

function queryAnd(a?: string, b?: string) {
  return a && b ? `${a} and ${b}` : a || b || '';
}

export function getMediaQuery(
  {
    width,
    orientation,
  }: {
    width?: { min?: number; max?: number };
    orientation?: Media['orientation'];
  },
  { orientation: oriented = true } = {},
) {
  const orientationQuery =
    (oriented && orientation && `(orientation: ${orientation})`) || undefined;
  if (!width) {
    return orientationQuery || '';
  }
  const { min, max } = width;
  return queryAnd(
    orientationQuery,
    queryAnd(
      (typeof min === 'number' && `(min-width: ${min}px)`) || undefined,
      (typeof max === 'number' && `(max-width: ${max}px)`) || undefined,
    ),
  );
}
