import {
  Handler as StdHandler,
  Handlers as StdHandlers,
  Options,
  ScrollListener,
  State,
} from './ScrollListener';

export * from './rect';

export { windowSize } from './windowSize';
export { resolveCSSPlacement } from './placement';
export { ScrollListener, StdHandler, StdHandlers };

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

function wrapHandler<T extends Element>(handler?: Handler<T>) {
  if (!handler) {
    return undefined;
  }
  return ({
    target,
    targetRect,
    boundaryYInView,
  }: Parameters<StdHandler<T>>[0]) => {
    const { start, end } = boundaryYInView;
    const total = start - end + targetRect.height;
    const distance = start - targetRect.top;
    return handler({ target, distance, total });
  };
}

export function addScrollListener<T extends Element>(
  element: T,
  {
    handlers,
    ...options
  }: Partial<
    Omit<Options<T>, 'handlers'> & { handlers: Partial<Handlers<T>> }
  > = {},
): ScrollListener<T> {
  return new ScrollListener(element, {
    ...options,
    handlers: handlers && {
      onStateChange: handlers.onStateChange,
      before: wrapHandler<T>(handlers.before),
      inView: wrapHandler<T>(handlers.inView),
      after: wrapHandler<T>(handlers.after),
      always: wrapHandler<T>(handlers.always),
    },
  });
}

type ScrollHandler<T extends Element> = (
  element: T,
  dist: number,
  total: number,
) => void | 'done';
export interface ScrollHandlers<T extends Element> {
  onStateChange(element: T, state: State, oldState: State): 'done' | void;
  before: ScrollHandler<T>;
  inView: ScrollHandler<T>;
  after: ScrollHandler<T>;
  always: ScrollHandler<T>;
}
function wrapScrollHandler<T extends Element>(handler?: ScrollHandler<T>) {
  if (!handler) {
    return undefined;
  }
  return ({
    target,
    targetRect,
    boundaryYInView,
  }: Parameters<StdHandler<T>>[0]) => {
    const { start, end } = boundaryYInView;
    const total = start - end + targetRect.height;
    const distance = start - targetRect.top;
    return handler(target, distance, total);
  };
}

/**
 * @deprecated use `addScrollListener` instead
 */
export function scrollHandle<T extends Element>(
  element: T,
  {
    handlers,
    ...options
  }: Partial<
    Omit<Options, 'handlers'> & { handlers: Partial<ScrollHandlers<T>> }
  > = {},
): () => void {
  const onStateChange = handlers && handlers.onStateChange;
  const listener = new ScrollListener(element, {
    ...options,
    handlers: handlers && {
      onStateChange:
        onStateChange &&
        (({ target, state, oldState }) =>
          onStateChange(target, state, oldState)),
      before: wrapScrollHandler<T>(handlers.before),
      inView: wrapScrollHandler<T>(handlers.inView),
      after: wrapScrollHandler<T>(handlers.after),
      always: wrapScrollHandler<T>(handlers.always),
    },
  });
  return () => {
    listener.destroy();
  };
}

export default scrollHandle;
