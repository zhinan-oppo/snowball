import { PlacementOrPercent, resolvePlacement } from './placement';
import { Rect } from './rect';
import { ScrollRoot } from './ScrollRoot';
import { BoundaryMode, Viewport } from './Viewport';

export { windowSize } from './windowSize';
export { resolveCSSPlacement } from './placement';

export type State = 'before' | 'inView' | 'after';

interface HandlerParams<
  T extends Element = Element,
  TRoot extends Element | Window = Element | Window
> {
  target: T;
  targetRect: Rect;
  boundaryYActive: { start: number; end: number };
  boundaryYInView: { start: number; end: number };
  root: TRoot;
  rootRect: Rect;
}

export type StdHandler<
  T extends Element = Element,
  TRoot extends Element | Window = Element | Window
> = (params: HandlerParams<T, TRoot>) => void | 'done';

export interface StdHandlers<
  T extends Element,
  TRoot extends Element | Window = Element | Window
> {
  /**
   * 当 state 变化时触发
   *
   * 如果返回值为'done'，该 handler 会被移除，之后不再触发
   */
  onStateChange?: (params: {
    target: T;
    state: State;
    oldState: State;
  }) => void | 'done';

  /**
   * 当 target 在`可视区域下方`时触发，`distance`的值始终小于`0`
   *
   * 如果返回值为'done'，该 handler 会被移除，之后不再触发
   */
  before?: StdHandler<T, TRoot>;

  /**
   * 当 target 在`可视区域中`时触发，`distance`的值的范围为`[0, total]`
   *
   * 如果返回值为'done'，该 handler 会被移除，之后不再触发
   */
  inView?: StdHandler<T, TRoot>;

  /**
   * 当 target 在`可视区域上方`时触发，`distance`的值始终大于`total`
   *
   * 如果返回值为'done'，该 handler 会被移除，之后不再触发
   */
  after?: StdHandler<T, TRoot>;

  /**
   * 始终触发，包含了`before`、`inView`以及`after`过程
   *
   * 如果返回值为'done'，该 handler 会被移除，之后不再触发
   */
  always?: StdHandler<T, TRoot>;
}

export type Handler<T extends Element> = (params: {
  target: T;
  distance: number;
  total: number;
}) => void | 'done';

export interface Handlers<T extends Element> {
  onStateChange(params: {
    target: T;
    state: State;
    oldState: State;
  }): void | 'done';
  before: Handler<T>;
  inView: Handler<T>;
  after: Handler<T>;
  always: Handler<T>;
}

export interface Options<
  T extends Element = Element,
  TRoot extends Element | Window = Element | Window
> {
  handlers: StdHandlers<T, TRoot>;

  /**
   * 可视区域开始的位置
   */
  start: PlacementOrPercent;

  /**
   * 可视区域结束的位置
   */
  end: PlacementOrPercent;

  before?: PlacementOrPercent;
  after?: PlacementOrPercent;
  root: Window | HTMLElement;

  passive: boolean;

  /**
   * 当 state 从`inView`变为`before`或`after`时，是否以相应的边界条件触发`inView`回调
   *
   * 'inView' --> 'before': handlers.inView({ distance: 0, total })
   * 'inView' --> 'after': handlers.inView({ distance: total, total })
   */
  forceInViewBoundary: boolean;

  /**
   * 暂时不可用
   */
  useIntersectionObserver: boolean;
}

export interface ScrollListener {
  destroy(): void;
}

/**
 * 封装以兼容旧的调用
 */
export function addScrollListener<T extends Element>(
  element: T,
  {
    handlers: { inView, before, after, onStateChange } = {},
    start,
    end,
    root,
  }: Partial<
    Omit<Options<T>, 'handlers'> & { handlers: Partial<Handlers<T>> }
  > = {},
): ScrollListener {
  let state: State = 'before';
  const setState = (newState: State) => {
    const oldState = state;
    state = newState;

    if (onStateChange && newState !== oldState) {
      onStateChange({ target: element, state, oldState });
    }
  };

  const container = ScrollRoot.getOrAdd(root);

  const viewport = new Viewport(
    resolvePlacement(start || 'bottom', 't2b'),
    resolvePlacement(end || 'top', 't2b'),
    BoundaryMode.Both,
  );

  if (inView) {
    container.watch(element, viewport, {
      onScroll({ target, targetRect, rootRect, start, end }) {
        setState('inView');

        inView({
          target: target as T,
          distance: rootRect.height - targetRect.top - start,
          total: end - start + targetRect.height,
        });
      },
    });
  }

  if (before) {
    container.watch(element, viewport.getBefore({ percent: 1 }), {
      onScroll({ target, targetRect, rootRect, start, end }) {
        setState('before');

        const total = end - start + targetRect.height;
        const distance = rootRect.height - targetRect.top - start;
        before({
          total,
          target: target as T,
          distance: distance - total,
        });
      },
    });
  }

  if (after) {
    container.watch(element, viewport.getBefore({ percent: 1 }), {
      onScroll({ target, targetRect, rootRect, start, end }) {
        setState('after');

        const total = end - start + targetRect.height;
        const distance = rootRect.height - targetRect.top - start;
        after({
          total,
          target: target as T,
          distance: distance + total,
        });
      },
    });
  }

  return {
    destroy() {
      return undefined;
    },
  };
}
