import {
  addScrollListener,
  Handlers,
  resolveCSSPlacement,
  ScrollListener,
  windowSize,
} from '@zhinan-oppo/scroll-handle';

import { getSupportedKeyword } from './util';

declare const __DEBUG__: boolean;

type ScrollHandlers = Handlers<HTMLElement>;

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
  scrollHandlers?: Partial<ScrollHandlers>;
  passive?: boolean;
  /**
   * e.g. `'-1px'` `'10%'` `-1`(the same as `'-1px'`)
   */
  top?: number | string;
}

export interface StickyMarkupOptions {
  root?: ParentNode;
  topAttr?: string;
  passiveAttr?: string;
  defaults?: {
    passive?: StickyOptions['passive'];
    top?: StickyOptions['top'];
  };
}

const CONFIGS = {
  addedFlagAttr: 'z-sticky-added',
  topAttr: 'data-top',
  passiveAttr: 'data-passive',
  forceFixed: false,
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
  { scrollHandlers, passive = false, top: topOffset = '0' }: StickyOptions = {},
): { destroy: () => void; reset: () => void } {
  const container = element.parentElement;
  if (!container) {
    throw new Error('The element.parentElement should exist');
  }
  const topPlacement = resolveCSSPlacement(topOffset);
  const top = typeof topOffset === 'number' ? `${topOffset}px` : topOffset;

  let scrollListener: ScrollListener<HTMLElement> | undefined;
  const _init = () => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const topToContainer = elementRect.top - containerRect.top;
    const start = {
      percent: topPlacement.percent,
      targetPercent: topPlacement.targetPercent,
      distance: topPlacement.distance - topToContainer,
    };
    const end = {
      percent: topPlacement.percent,
      targetPercent: topPlacement.targetPercent,
      distance: topPlacement.distance + elementRect.height,
    };
    if (__DEBUG__) {
      console.debug('init sticky', { element, start, end });
    }

    const supportedSticky = !CONFIGS.forceFixed && getSupportedKeyword();
    if (supportedSticky) {
      element.style.position = supportedSticky;
      element.style.top = top;
      const listener =
        scrollHandlers &&
        addScrollListener(container, {
          start,
          end,
          handlers: scrollHandlers,
        });
      return {
        reset: () => undefined,
        destroy: () => listener && listener.destroy(),
      };
    }

    const left = `${elementRect.left}px`;
    const width = `${elementRect.width}px`;
    const height = `${elementRect.height}px`;

    if (scrollListener) {
      scrollListener.destroy();
    }
    scrollListener = addScrollListener(container, {
      start,
      end,
      handlers: {
        onStateChange: ({ target, state, oldState }): void => {
          switch (state) {
            case 'inView':
              setStyles(element, {
                top,
                left,
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
          if (scrollHandlers?.onStateChange) {
            scrollHandlers.onStateChange({ target, state, oldState });
          }
        },
        before: scrollHandlers?.before,
        inView: scrollHandlers?.inView,
        after: scrollHandlers?.after,
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
    if (scrollListener) {
      scrollListener.destroy();
      scrollListener = undefined;
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
  const { passive = false, top = '0' } = defaults;
  const controllers: Array<ReturnType<typeof initStickyElement>> = [];
  root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (!element.hasAttribute(CONFIGS.addedFlagAttr)) {
      controllers.push(
        initStickyElement(element, {
          passive: element.hasAttribute(passiveAttr) || passive,
          top: element.getAttribute(topAttr) || top,
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
