import { Rect, rectFrom } from './rect';
import { getWindowRect, windowSize } from './windowSize';

export type Root = Window | HTMLElement;
export type RootLike = Root | Document;

export type ScrollRootHandler = (ctx: {
  rootRect: Rect;
  seq: number;
  root: Root;
  scrollTop: number;
  /**
   * 由两次 scrollTop 差值计算而来，
   * > 0: 页面内容在向上移动（正常浏览）
   * < 0: 页面内容在向下移动（回滚）
   */
  direction: number;
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

  /**
   * 如果存在一个绑定在`element`上的`ScrollRoot`实例则返回该实例，
   * 否则新建一个实例并返回
   */
  static obtain(element: RootLike = window): ScrollRoot {
    if (windowEquivalent(element)) {
      element = window;
    }

    return this.roots.get(element) || new ScrollRoot(element);
  }

  private readonly element: Root;
  private readonly scrollHandlers: ScrollRootHandler[] = [];
  private seq = 0;
  private lastScrollTop = 0;

  private _rect?: Rect;
  private removeSizeListener?: () => void;
  private resizeObserver?: ResizeObserver;

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
     * 当 ResizeObserver 不被支持时，只好用 window 的 resize 事件替代
     */
    if (window.ResizeObserver && this.element instanceof Element) {
      this.resizeObserver = new window.ResizeObserver(() => {
        this._rect = this.queryRect();
      });
      this.resizeObserver.observe(this.element, {
        box: 'content-box',
      });
    } else {
      this.removeSizeListener = windowSize.addSizeListener(() => {
        this._rect = this.queryRect();
      });
    }
    return this._rect;
  }

  get scrollTop(): number {
    if (this.element instanceof Window) {
      return this.element.scrollY;
    }
    return this.element.scrollTop;
  }

  watch(handler: ScrollRootHandler): void {
    if (this.scrollHandlers.length === 0) {
      this.init();
    }
    this.scrollHandlers.push(handler);
  }

  unwatch(handler: ScrollRootHandler): void {
    const i = this.scrollHandlers.indexOf(handler);
    if (i >= 0) {
      this.scrollHandlers.splice(i, 1);
      if (this.scrollHandlers.length === 0) {
        this.clear();
      }
    }
  }

  onScroll(): void {
    const { rect, scrollTop, element, lastScrollTop } = this;
    const seq = (this.seq += 1);
    const direction = scrollTop - lastScrollTop;
    this.scrollHandlers.forEach((handler) => {
      handler({
        seq,
        direction,
        root: element,
        rootRect: rect,
        scrollTop: scrollTop,
      });
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
    if (this.element instanceof Element && this.resizeObserver) {
      this.resizeObserver.unobserve(this.element);
    }
  }

  private queryRect() {
    return this.element instanceof Window
      ? rectFrom(getWindowRect())
      : this.element.getBoundingClientRect();
  }
}
