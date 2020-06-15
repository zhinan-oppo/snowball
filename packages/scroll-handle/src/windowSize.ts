import { WindowSize } from '@zhinan-oppo/shared';

const windowSize = new WindowSize();

export function getWindowHeight(): number {
  return windowSize.height;
}
