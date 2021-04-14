import { windowSize, getWindowRect } from './windowSize';
import { Rect, rectFrom } from './rect';

export type Root = Window | HTMLElement;
export type RootLike = Root | Document;

export type ScrollHandler = (ctx: {
  rootRect: Rect;
  seq: number;
  root: Root;
}) => void;

function windowEquivalent(container: RootLike): container is Window | Document {
  return (
    container instanceof Window ||
    container instanceof Document ||
    container === window.document.documentElement ||
    container === window.document.body
  );
}

function notWindowEquivalent(container: RootLike): container is HTMLElement {
  return !windowEquivalent(container);
}

export class ScrollRoot {
  private static readonly roots: WeakMap<Root, ScrollRoot> = new WeakMap();

  static obtain(element: RootLike = window): ScrollRoot {
    if (windowEquivalent(element)) {
      element = window;
    }

    return this.roots.get(element) || new ScrollRoot(element);
  }

  private readonly element: Root;
  private readonly scrollHandlers: ScrollHandler[] = [];
  private seq = 0;

  private _rect?: Rect;
  private removeSizeListener?: () => void;

  private handler = () => this.onScroll();

  private constructor(_element: Root) {
    if (notWindowEquivalent(_element)) {
      this.element = _element;
    } else {
      this.element = window;
    }
  }

  get rect(): Rect {
    if (this._rect) {
      return this._rect;
    }
    this._rect = this.queryRect();
    /**
     * FIXME: 实际上当 root 不是 window 时，应该使用 ResizeObserver。
     * 但 ResizeObserver 兼容性不佳，
     * 以及目前实际情况下直接监听 window 的 resize 事件勉强能接受，
     * 故此处依然监听 window 的 resize 事件。TODO: 增加 ResizeObserver
     */
    this.removeSizeListener = windowSize.addSizeListener(() => {
      this._rect = this.queryRect();
    });
    return this._rect;
  }

  watch(handler: ScrollHandler): void {
    if (this.scrollHandlers.length === 0) {
      this.init();
    }
    this.scrollHandlers.push(handler);
  }

  unwatch(handler: ScrollHandler): void {
    const i = this.scrollHandlers.indexOf(handler);
    if (i >= 0) {
      this.scrollHandlers.splice(i, 1);
      if (this.scrollHandlers.length === 0) {
        this.clear();
      }
    }
  }

  onScroll(): void {
    const { rect } = this;
    const seq = (this.seq += 1);
    this.scrollHandlers.forEach((handler) => {
      handler({ rootRect: rect, seq, root: this.element });
    });
  }

  private init() {
    /**
     * TODO: 可以设置 AddEventListenerOptions
     * 目前一个 root 只会有一个 ScrollRoot 实例，也不好加
     */
    this.element.addEventListener('scroll', this.handler, {
      passive: true,
      capture: false,
    });
  }

  private clear(): void {
    this.element.removeEventListener('scroll', this.handler);
    if (this.removeSizeListener) {
      this.removeSizeListener();
    }
  }

  private queryRect() {
    return this.element instanceof Window
      ? rectFrom(getWindowRect())
      : this.element.getBoundingClientRect();
  }
}
