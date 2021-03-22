import { windowSize, getWindowRect } from './windowSize';
import { Rect, rectFrom } from './rect';
import { ScrollElement, ViewportOptions } from './ScrollElement';
import { Viewport } from './Viewport';

export type Root = Window | HTMLElement;
type RootLike = Root | Document;

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
  /**
   * The attribute name of the scroll root ID;
   * 'data-scroll-root-id' by default.
   */
  static ATTR_ID = 'data-scroll-root-id';

  private static rootCnt = 0;
  private static readonly roots: Record<string, ScrollRoot> = Object.create(
    null,
  );

  static getOrAdd(element: RootLike = window): ScrollRoot {
    let root: ScrollRoot;
    if (notWindowEquivalent(element)) {
      const id = element.getAttribute(ScrollRoot.ATTR_ID);
      root = (id && this.roots[id]) || new ScrollRoot(element);
    } else {
      root = this.roots.window || new ScrollRoot(element);
    }
    if (!this.roots[root.id]) {
      this.roots[root.id] = root;
    }
    return root;
  }

  private readonly id: string;
  private readonly element: Root;
  private readonly elements: Array<ScrollElement<Element>> = [];
  private seq = 0;

  private _rect?: Rect;
  private removeSizeListener?: () => void;

  private scrollHandler = () => this.onScroll();

  private constructor(_element: RootLike) {
    if (notWindowEquivalent(_element)) {
      this.element = _element;
      this.id = (ScrollRoot.rootCnt += 1).toString();
    } else {
      this.element = window;
      this.id = 'window';
    }
    this.element.addEventListener('scroll', this.scrollHandler, {
      passive: true,
      capture: false,
    });
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
     * 故此处依然监听 window 的 resize 事件。
     */
    windowSize.addSizeListener(() => {
      this._rect = this.queryRect();
    });
    return this._rect;
  }

  watch(
    element: Element,
    viewport: Viewport,
    options: ViewportOptions<Element>,
  ): this {
    const scrollElement = ScrollElement.getOrAdd(element, this.id);
    scrollElement.addViewport(viewport, options);
    this.elements.push(scrollElement);
    return this;
  }

  onScroll(): void {
    const { rect } = this;
    const seq = (this.seq += 1);
    this.elements.forEach((element) => {
      element.onScroll({ rootRect: rect, seq, root: this.element });
    });
  }

  destroy(): void {
    this.element.removeEventListener('scroll', this.scrollHandler);
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
