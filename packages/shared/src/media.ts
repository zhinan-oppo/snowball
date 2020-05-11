import { getWindowWidth } from './windowSize';

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

export function matchMedia(medias: Media[], windowWidth = getWindowWidth()) {
  const windowOrientation = window.matchMedia(`(orientation: landscape)`)
    .matches
    ? 'landscape'
    : 'portrait';
  for (let i = 0; i < medias.length; i += 1) {
    const media = medias[i];
    const { width, orientation } = media;

    if (orientation && orientation !== windowOrientation) {
      return;
    }

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
