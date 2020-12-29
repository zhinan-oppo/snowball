import { WindowSize } from '@zhinan-oppo/shared';

export const windowSize = WindowSize.singleton;

export function getWindowHeight(): number {
  return WindowSize.getHeight();
}

export function getWindowRect(): DOMRectInit {
  return {
    x: 0,
    y: 0,
    width: WindowSize.getWidth(),
    height: WindowSize.getHeight(),
  };
}
