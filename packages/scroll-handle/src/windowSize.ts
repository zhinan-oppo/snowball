import { WindowSize } from '@zhinan-oppo/shared';

export const windowSize = new WindowSize();

export function getWindowHeight(): number {
  return windowSize.height;
}

export function getWindowRect(): DOMRectInit {
  return {
    x: 0,
    y: 0,
    width: windowSize.width,
    height: windowSize.height,
  };
}
