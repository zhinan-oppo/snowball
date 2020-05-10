export function getWindowHeight(): number {
  return (
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight
  );
}

export function getWindowWidth(): number {
  return (
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth
  );
}

interface Size {
  width: number;
  height: number;
}
interface Listeners {
  width: LengthListener[];
  height: LengthListener[];
  size: SizeListener[];
}
type LengthListener = (n?: number, o?: number) => void;
type SizeListener = (nSize: Partial<Size>, oSize: Partial<Size>) => void;

function removeElementFrom<T>(arr: T[]) {
  return (ele: T) => {
    const i = arr.indexOf(ele);
    if (i !== -1) {
      arr.splice(i, 1);
    }
  };
}

export class WindowSize {
  private readonly size: Partial<Size> = Object.create(null);
  private readonly listeners: Listeners = {
    width: [],
    height: [],
    size: [],
  };

  private readonly onResize = () => {
    const { size, listeners } = this;
    const { width, height } = size;

    size.width = getWindowWidth();
    size.height = getWindowHeight();

    let resized = false;
    if (size.width !== width) {
      listeners.width.forEach((callback) => callback(size.width, width));
      resized = true;
    }
    if (size.height !== height) {
      listeners.height.forEach((callback) => callback(size.height, height));
      resized = true;
    }
    if (resized) {
      listeners.size.forEach((callback) =>
        callback({ width: size.width, height: size.height }, { width, height }),
      );
    }
  };
  private readonly removeWidthHandler = removeElementFrom(this.listeners.width);
  private readonly removeHeightHandler = removeElementFrom(
    this.listeners.height,
  );
  private readonly removeSizeHandler = removeElementFrom(this.listeners.size);

  constructor() {
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
  }

  get height() {
    const { size } = this;
    return size.height || (size.height = getWindowHeight()) || 0;
  }

  get width() {
    const { size } = this;
    return size.width || (size.width = getWindowWidth()) || 0;
  }

  addWidthListener(callback: LengthListener) {
    this.listeners.width.push(callback);
    return () => this.removeWidthHandler(callback);
  }

  addHeightListener(callback: LengthListener) {
    this.listeners.height.push(callback);
    return () => this.removeHeightHandler(callback);
  }
  /**
   * 当 width 或 height 变化时被调用
   * @param {(size: Size, oldSize: Size) => void} callback
   */
  addSizeListener(callback: SizeListener) {
    this.listeners.size.push(callback);
    return () => this.removeSizeHandler(callback);
  }
}
