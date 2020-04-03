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

const size: Partial<Size> = Object.create(null);

const listeners: Listeners = {
  width: [],
  height: [],
  size: [],
};

function _getWindowHeight(): number {
  size.height =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight;
  return size.height;
}

function _getWindowWidth(): number {
  size.width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
  return size.width;
}

const onResize = () => {
  const { width, height } = size;

  _getWindowWidth();
  _getWindowHeight();

  let resized = false;
  if (size.width !== width) {
    listeners.width.forEach(callback => callback(size.width, width));
    resized = true;
  }
  if (size.height !== height) {
    listeners.height.forEach(callback => callback(size.height, height));
    resized = true;
  }
  if (resized) {
    listeners.size.forEach(callback =>
      callback({ width: size.width, height: size.height }, { width, height }),
    );
  }
};
window.addEventListener('resize', onResize);

/**
 * @returns {number}
 */
export function getWindowHeight(): number {
  return size.height || _getWindowHeight() || 0;
}

/**
 * @returns {number}
 */
export function getWindowWidth(): number {
  return size.width || _getWindowWidth() || 0;
}

/**
 * @param {array} arr
 */
function removeElementFrom<T>(arr: T[]) {
  return (ele: T) => {
    const i = arr.indexOf(ele);
    if (i !== -1) {
      arr.splice(i, 1);
    }
  };
}
const removeWidthHandler = removeElementFrom(listeners.width);
const removeHeightHandler = removeElementFrom(listeners.height);
const removeAnyHandler = removeElementFrom(listeners.size);

/**
 * 当 width 变化时被调用
 * @param {(width: number, oldWidth: number) => void} callback
 */
export function addWidthListener(callback: LengthListener) {
  listeners.width.push(callback);
  return () => removeWidthHandler(callback);
}
/**
 * 当 height 变化时被调用
 * @param {(height: number, oldHeight: number) => void} callback
 */
export function addHeightListener(callback: LengthListener) {
  listeners.height.push(callback);
  return () => removeHeightHandler(callback);
}
/**
 * 当 width 或 height 变化时被调用
 * @param {(size: Size, oldSize: Size) => void} callback
 */
export function addSizeListener(callback: SizeListener) {
  listeners.size.push(callback);
  return () => removeAnyHandler(callback);
}
