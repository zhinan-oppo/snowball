import { Rect } from './rect';

import { CalculatedViewport, Viewport, BoundaryMode } from './Viewport';
import { Root, RootLike, ScrollRoot } from './ScrollRoot';

interface HandlerParams<TContext, T extends Element>
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
  /**
   * The attribute name of the scroll element ID;
   * 'data-scroll-ele-id' by default.
   */
  static ATTR_ID = 'data-scroll-ele-id';

  private static elementCnt = 0;
  private static readonly elements: WeakMap<
    ScrollRoot,
    WeakMap<Element, ScrollElement>
  > = new WeakMap();

  static getOrAdd<T extends Element>(
    _element: T,
    _root?: RootLike,
  ): ScrollElement<T> {
    const root = ScrollRoot.getOrAdd(_root);
    const elementMap = this.elements.get(root);

    const foundInRoot = elementMap && elementMap.get(_element);
    if (foundInRoot) {
      return (foundInRoot as unknown) as ScrollElement<T>;
    }

    const element = (new ScrollElement(
      _element,
      root,
    ) as unknown) as ScrollElement;
    if (elementMap) {
      elementMap.set(_element, element);
    } else {
      const map: WeakMap<Element, ScrollElement> = new WeakMap();
      map.set(_element, element);
      this.elements.set(root, map);
    }
    return (element as unknown) as ScrollElement<T>;
  }

  private readonly id: string;

  private lastSeq = 0;
  private viewportArray: ViewportWithOptions<any, T>[] = [];
  private handler = (...args: Parameters<ScrollElement['onScroll']>) =>
    this.onScroll(...args);

  constructor(private readonly element: T, private readonly root: ScrollRoot) {
    this.id = (ScrollElement.elementCnt += 1).toString();
    element.setAttribute(ScrollElement.ATTR_ID, `${root.id}-${this.id}`);

    root.watch(this.handler);
  }

  get rect(): Rect {
    return this.element.getBoundingClientRect();
  }

  addViewport<TContext>(
    viewport: Viewport<TContext>,
    onScroll: Handler<TContext, T>,
  ): this {
    this.viewportArray.push({ viewport, options: { onScroll } });
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
   * 在一个回调函数中迭代调用其他回调，
   * 实际上能否有优化效果是未知的...
   *
   * TODO: 或许可以通过一些信息省略一部分回调操作
   * 现在的 before 或 after 应该会影响到优化的可能性
   * @param param0
   */
  private onScroll({
    rootRect,
    seq,
    root,
  }: {
    rootRect: Rect;
    seq: number;
    root: Root;
  }): void {
    if (this.lastSeq === seq) {
      return undefined;
    }

    this.lastSeq = seq;
    const targetRect = this.rect;
    const sorted = this.viewportArray
      .map(({ viewport, options }) => {
        return {
          viewport: viewport.toCalculated({ targetRect, rootRect }),
          options,
        };
      })
      .sort((a, b) => {
        return a.viewport.start - b.viewport.end;
      });

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
