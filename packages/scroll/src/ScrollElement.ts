import { sortViewportEnd, sortViewportStart } from './helpers';
import { Rect } from './rect';
import { Root, RootLike, ScrollRoot, ScrollRootHandler } from './ScrollRoot';
import { BoundaryMode, CalculatedViewport, Viewport } from './Viewport';

export interface HandlerParams<TContext, T extends Element>
  extends CalculatedViewport<TContext> {
  target: T;
  targetRect: Rect;
  root: Root;
  rootRect: Rect;
  context: TContext;
}
type Handler<TContext, TARGET extends Element> = (
  params: HandlerParams<TContext, TARGET>,
) => void;

export interface ViewportOptions<TContext, TARGET extends Element> {
  forceBoundary?: boolean;
  onScroll: Handler<TContext, TARGET>;
}

interface ViewportWithOptions<TContext, TARGET extends Element> {
  viewport: Viewport<TContext>;
  options: ViewportOptions<TContext, TARGET>;
}

export class ScrollElement<T extends Element = Element> {
  private static readonly elements: WeakMap<
    ScrollRoot,
    WeakMap<Element, ScrollElement<any>>
  > = new WeakMap();

  /**
   * 如果存在一个绑定在`element`上并以`root`作为`ScrollRoot`的
   * `ScrollElement`实例则返回该实例，否则新建一个实例并返回
   */
  static obtain<T extends Element>(
    _element: T,
    _root: RootLike = window,
  ): ScrollElement<T> {
    const root = ScrollRoot.obtain(_root);
    const elementMap = this.elements.get(root);

    const foundInRoot = elementMap && elementMap.get(_element);
    if (foundInRoot) {
      return (foundInRoot as unknown) as ScrollElement<T>;
    }

    const element = new ScrollElement(_element, root);
    if (elementMap) {
      elementMap.set(_element, element);
    } else {
      const map: WeakMap<Element, ScrollElement<any>> = new WeakMap();
      map.set(_element, element);
      this.elements.set(root, map);
    }
    return element;
  }

  private lastSeq = 0;
  private viewportArray: ViewportWithOptions<any, T>[] = [];
  private handler = (...args: Parameters<ScrollElement['onScroll']>) =>
    this.onScroll(...args);

  private constructor(
    private readonly element: T,
    private readonly root: ScrollRoot,
  ) {
    root.watch(this.handler);
  }

  get rect(): Rect {
    return this.element.getBoundingClientRect();
  }

  addViewport<TContext>(
    viewport: Viewport<TContext>,
    callback: Handler<TContext, T>,
  ): this {
    this.viewportArray.push({ viewport, options: { onScroll: callback } });
    return this;
  }

  destroy(): void {
    const map = ScrollElement.elements.get(this.root);
    if (map) {
      map.delete(this.element);
    }
    this.viewportArray = [];
    this.root.unwatch(this.handler);
  }

  /**
   * TODO: 或许可以通过一些信息省略一部分回调操作
   */
  private onScroll({
    rootRect,
    seq,
    root,
    direction,
  }: Parameters<ScrollRootHandler>[0]): void {
    if (this.lastSeq === seq) {
      return undefined;
    }

    this.lastSeq = seq;
    const targetRect = this.rect;
    const sorted = this.viewportArray
      .map(({ viewport, options }) => {
        return {
          options,
          viewport: viewport.toCalculated({ targetRect, rootRect }),
        };
      })
      .sort(
        /**
         * 正常向下浏览时，按 start 位置从前到后排
         * 回滚向上浏览时，按  end  位置从后到前排
         */
        direction > 0 ? sortViewportStart : sortViewportEnd,
      );

    window.requestAnimationFrame(() => {
      sorted.forEach(({ viewport, options: { onScroll } }) => {
        const dist = rootRect.height - targetRect.top - viewport.start;
        const total = viewport.end - viewport.start + targetRect.height;
        if (
          (dist > 0 ||
            (dist === 0 && viewport.boundary & BoundaryMode.Start)) &&
          (dist < total ||
            (dist === total && viewport.boundary & BoundaryMode.End))
        ) {
          onScroll({
            root,
            rootRect,
            target: this.element,
            targetRect,
            ...viewport,
          });
        }
      });
    });
  }
}
