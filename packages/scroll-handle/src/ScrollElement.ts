import { Rect } from './rect';

import { CalculatedViewport, Viewport, BoundaryMode } from './Viewport';
import { Root } from './ScrollRoot';

interface HandlerParams<T extends Element> extends CalculatedViewport {
  target: T;
  targetRect: Rect;
  root: Root;
  rootRect: Rect;
}
type Handler<TARGET extends Element> = (params: HandlerParams<TARGET>) => void;

export interface ViewportOptions<TARGET extends Element> {
  forceBoundary?: boolean;
  onScroll: Handler<TARGET>;
}

interface ViewportWithOptions<TARGET extends Element> {
  viewport: Viewport;
  options: ViewportOptions<TARGET>;
}

export class ScrollElement<T extends Element> {
  /**
   * The attribute name of the scroll element ID;
   * 'data-scroll-ele-id' by default.
   */
  static ATTR_ID = 'data-scroll-ele-id';

  private static elementCnt = 0;
  private static readonly elements: Record<string, ScrollElement<Element>> = {};

  static getOrAdd<T extends Element>(
    _element: T,
    rootID: string,
  ): ScrollElement<T> {
    const id = _element.getAttribute(ScrollElement.ATTR_ID);
    if (id && this.elements[id]) {
      return (this.elements[id] as unknown) as ScrollElement<T>;
    }

    const element = new ScrollElement(_element, rootID);
    this.elements[element.id] = (element as unknown) as ScrollElement<Element>;
    return element;
  }

  private readonly id: string;

  private lastSeq = 0;
  private viewportArray: ViewportWithOptions<T>[] = [];

  constructor(private readonly element: T, rootID: string) {
    this.id = (ScrollElement.elementCnt += 1).toString();
    element.setAttribute(ScrollElement.ATTR_ID, `${rootID}-${this.id}`);
  }

  get rect(): Rect {
    return this.element.getBoundingClientRect();
  }

  addViewport(viewport: Viewport, options: ViewportOptions<T>): void {
    this.viewportArray.push({
      viewport,
      options,
    });
  }

  /**
   * 在一个回调函数中迭代调用其他回调，
   * 实际上能否有优化效果是未知的...
   *
   * TODO: 或许可以通过一些信息省略一部分回调操作
   * 现在的 before 或 after 应该会影响到优化的可能性
   * @param param0
   */
  onScroll({
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
