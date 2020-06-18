import {
  scrollHandle,
  ScrollHandlers as StdHandlers,
  windowSize,
} from '@zhinan-oppo/scroll-handle';

declare const __DEBUG__: boolean;

type ScrollHandlers = StdHandlers<HTMLElement>;

type ChangeableStyles =
  | 'left'
  | 'bottom'
  | 'top'
  | 'position'
  | 'transform'
  | 'margin'
  | 'width'
  | 'height';
function setStyles(
  element: HTMLElement,
  styles: { [P in ChangeableStyles]?: string } = {},
): void {
  ([
    'left',
    'bottom',
    'top',
    'position',
    'transform',
    'margin',
    'width',
    'height',
  ] as ChangeableStyles[]).forEach((k) => {
    element.style[k] = styles[k] || '';
  });
}

export interface StickyOptions {
  container?: HTMLElement;
  scrollHandlers?: Partial<ScrollHandlers>;
  passive?: boolean;
  top?: number;
}

export interface StickyMarkupOptions {
  root?: ParentNode;
  topAttr?: string;
  passiveAttr?: string;
  defaults?: {
    passive?: boolean;
    top?: number;
  };
}

const CONFIGS = {
  addedFlagAttr: 'z-sticky-added',
  topAttr: 'data-top',
  passiveAttr: 'data-passive',
};
type Configs = typeof CONFIGS;
export function configure<T extends keyof Configs>(
  key: T,
  value: Configs[T],
): void {
  CONFIGS[key] = value;
}

export function initStickyElement(
  element: HTMLElement,
  {
    container: _container,
    scrollHandlers = {},
    passive = false,
    top: topOffset = 0,
  }: StickyOptions = {},
): { destroy: () => void; reset: () => void } {
  let container: HTMLElement;
  if (!_container) {
    const parent = element.parentElement;
    if (!parent) {
      throw new Error('Container not found');
    }
    container = parent;
  } else {
    container = _container;
  }

  let removeHandle: ReturnType<typeof scrollHandle> | undefined;
  const _init = () => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (__DEBUG__) {
      // eslint-disable-next-line no-console
      console.debug({
        elementRect,
        containerRect,
        element,
        container,
      });
    }

    const bottomToContainerTop = elementRect.bottom - containerRect.top;
    const top = `${topOffset + elementRect.top - containerRect.top}px`;
    const left = `${elementRect.left}px`;
    const width = `${elementRect.width}px`;
    const height = `${elementRect.height}px`;

    if (removeHandle) {
      removeHandle();
    }
    removeHandle = scrollHandle(container, {
      start: { percent: 'top', distance: topOffset },
      end: { percent: 'top', distance: bottomToContainerTop + topOffset },
      handlers: {
        before: scrollHandlers.before,
        inView: scrollHandlers.inView,
        after: scrollHandlers.after,
        onStateChange: (doms, state, oldState): void => {
          switch (state) {
            case 'inView':
              setStyles(element, {
                left,
                top,
                width,
                height,
                position: 'fixed',
                bottom: 'auto',
                transform: 'none',
                margin: '0',
              });
              break;
            case 'after':
              setStyles(element, {
                left: `${
                  element.getBoundingClientRect().left -
                  container.getBoundingClientRect().left
                }px`,
                top: 'auto',
                bottom: '0',
                position: 'absolute',
                transform: 'none',
                margin: '0',
              });
              break;
            case 'before':
            default:
              setStyles(element);
          }
          if (__DEBUG__) {
            const position =
              state === 'inView'
                ? 'fixed'
                : state === 'after'
                ? 'absolute'
                : '';
            // eslint-disable-next-line no-console
            console.debug(`sticky item: ${position}`, element);
          }
          if (scrollHandlers.onStateChange) {
            scrollHandlers.onStateChange(doms, state, oldState);
          }
        },
      },
    });
  };
  const initialStyles = window.getComputedStyle(element);
  const initialPosition = initialStyles.position;
  element.setAttribute(CONFIGS.addedFlagAttr, CONFIGS.addedFlagAttr);

  _init();
  const reset = () => {
    element.style.position = initialPosition;
    setStyles(element);
    _init();
  };
  if (!passive) {
    windowSize.addWidthListener(reset);
  }

  const destroy = (): void => {
    if (removeHandle) {
      removeHandle();
      removeHandle = undefined;
    }
  };

  return { destroy, reset };
}

export function initBySelector(
  selector: string,
  {
    root = window.document,
    passiveAttr = CONFIGS.passiveAttr,
    topAttr = CONFIGS.topAttr,
    defaults = {},
  }: StickyMarkupOptions = {},
): { destroy: () => void; reset: () => void } {
  const { passive = false, top = 0 } = defaults;
  const controllers: Array<ReturnType<typeof initStickyElement>> = [];
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (!element.hasAttribute(CONFIGS.addedFlagAttr)) {
      controllers.push(
        initStickyElement(element, {
          passive: element.hasAttribute(passiveAttr) || passive,
          top: parseFloat(element.getAttribute(topAttr) || '') || top,
        }),
      );
    }
  });
  const destroy = () => {
    controllers.forEach(({ destroy }) => {
      destroy();
    });
  };
  const reset = () => {
    controllers.forEach(({ reset }) => {
      reset();
    });
  };
  return { destroy, reset };
}

/**
 * @deprecated
 * @see initBySelector
 */
export const initAllBySelector = initBySelector;
