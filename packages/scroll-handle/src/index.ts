import { getWindowHeight } from './windowSize';

const PERCENTS = {
  bottom: 1,
  center: 0.5,
  top: 0,
  nextPage: 2,
  prevPage: -1,
};

type PercentToTopAlias = keyof typeof PERCENTS;
type PercentToTop = PercentToTopAlias | number;
type State = 'before' | 'inView' | 'after';
type Handler = (
  dom: Element,
  distance: number,
  totalDistance: number,
  startY: number,
) => void | 'done';

export interface ScrollHandlers {
  onStateChange?: (dom: Element, newState: State, oldState: State) => void;
  before?: Handler;
  inView?: Handler;
  after?: Handler;
  always?: Handler;
}

interface PlacementToTop {
  percent: PercentToTop;
  distance: number;
}
interface ScrollHandleOptions {
  handlers?: ScrollHandlers;
  start?: Partial<PlacementToTop> | PercentToTop;
  end?: Partial<PlacementToTop> | PercentToTop;
  addListener?: boolean | 'impassive';
  container?: Window | Element;
}

function getPercentFromAlias(alias: PercentToTop): number {
  if (typeof alias === 'number') {
    return alias;
  }
  return PERCENTS[alias] || 0;
}

export function addScrollListener(
  element: Element,
  {
    handlers = {},
    start: _start = {
      percent: 'bottom',
      distance: 0,
    },
    end: _end = {
      percent: 'top',
      distance: 0,
    },
    addListener = true,
    container = window,
  }: ScrollHandleOptions,
) {
  if (!(element instanceof window.HTMLElement)) {
    const e = new TypeError(`HTMLElement needed`);
    console.error(e);
    return {
      removeEventListener: () => undefined,
      getRangeY: () => [],
    };
  }
  const start =
    typeof _start === 'string' || typeof _start === 'number'
      ? {
          percent: getPercentFromAlias(_start),
          distance: 0,
        }
      : {
          percent: getPercentFromAlias(_start.percent || 'bottom'),
          distance: _start.distance || 0,
        };
  const end =
    typeof _end === 'string' || typeof _end === 'number'
      ? {
          percent: getPercentFromAlias(_end),
          distance: 0,
        }
      : {
          percent: getPercentFromAlias(_end.percent || 'top'),
          distance: _end.distance || 0,
        };
  const getRangeY = () => {
    const containerHeight =
      container === window
        ? getWindowHeight()
        : (container as Element).getBoundingClientRect().height;
    const startY = start.percent * containerHeight + start.distance;
    const endY = end.percent * containerHeight + end.distance;
    return [startY, endY];
  };

  let state: State = 'before';
  const changeState = (newState: State): void => {
    if (newState !== state) {
      if (handlers.onStateChange) {
        handlers.onStateChange(element, newState, state);
      }
      state = newState;
    }
  };
  // FIXME: container 大小位置相关的属性需要判断是否是 windows
  const handle = (): void => {
    const domRect = element.getBoundingClientRect();
    const top = domRect.top;
    const bottom = domRect.bottom;
    const height = domRect.height;
    const [startY, endY] = getRangeY();
    const distance = startY - top;
    const totalDistance = startY - endY + height;
    if (top > startY) {
      changeState('before');
      if (handlers.before) {
        if (
          handlers.before(element, distance, totalDistance, startY) === 'done'
        ) {
          handlers.before = undefined;
        }
      }
    } else if (bottom >= endY) {
      changeState('inView');
      if (handlers.inView) {
        if (
          handlers.inView(element, distance, totalDistance, startY) === 'done'
        ) {
          handlers.inView = undefined;
        }
      }
    } else {
      changeState('after');
      if (handlers.after) {
        if (
          handlers.after(element, distance, totalDistance, startY) === 'done'
        ) {
          handlers.after = undefined;
        }
      }
    }
    if (handlers.always) {
      if (
        handlers.always(element, distance, totalDistance, startY) === 'done'
      ) {
        handlers.always = undefined;
      }
    }
  };

  const handler = (): void => {
    window.requestAnimationFrame(handle);
  };
  const removeScrollHandler = addListener
    ? (): void => container.removeEventListener('scroll', handler)
    : () => undefined;
  if (addListener) {
    container.addEventListener('scroll', handler, {
      passive: addListener !== 'impassive',
      capture: false,
    });
  }

  window.setTimeout(() => handle(), 0);
  return { removeScrollHandler, getRangeY };
}

export function scrollHandle(element: Element, options: ScrollHandleOptions) {
  const { removeScrollHandler } = addScrollListener(element, options);
  return removeScrollHandler;
}

export default scrollHandle;
