import {
  addScrollListener,
  Handlers,
  resolveCSSPlacement,
  ScrollListener,
  windowSize,
} from '@zhinan-oppo/scroll-handle';

import { getSupportedKeyword, initPlaceholder } from './util';

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
  /**
   * 定住时到顶部的距离，可以是负数，默认为 '0px'
   * 支持`%`和`px`: '10%', '-1px'
   */
  top?: number | string;

  /**
   * 传递给 ScrollListener 的回调函数
   */
  scrollHandlers?: Partial<ScrollHandlers>;

  /**
   * scrollHandlers alias
   */
  handlers?: Partial<ScrollHandlers>;

  /**
   * 在`position: sticky`支持的情况下也使用 fixed 模拟
   */
  forceFixed?: boolean;

  /**
   * 当使用 fixed 模拟 sticky 时有效
   * 如果该值为`true`，则不在窗口宽度发生变化时重新计算元素的位置
   * 默认为`false`
   */
  passive?: boolean;

  /**
   * 传递给 addScrollListener
   */
  forceInViewBoundary?: boolean;
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
};
type Configs = typeof CONFIGS;
export function configure<T extends keyof Configs>(
  key: T,
  value: Configs[T],
): void {
  CONFIGS[key] = value;
}

/**
 * 使用 sticky 布局
 * 当浏览器不支持`position: sticky`时，通过 js 模拟
 *
 * @param element 要使用 sticky 布局的元素
 * @param options
 */
export function initStickyElement(
  element: HTMLElement,
  {
    forceInViewBoundary,
    handlers,
    scrollHandlers = handlers,
    passive = false,
    top: topOffset = '0',
    forceFixed = false,
  }: StickyOptions = {},
): { destroy: () => void; reset: () => void } {
  const container = element.parentElement;
  if (!container) {
    throw new Error('The element.parentElement should exist');
  }
  const topPlacement = resolveCSSPlacement(topOffset);
  const top = typeof topOffset === 'number' ? `${topOffset}px` : topOffset;

  let initialPosition: string | undefined;
  let placeholder: HTMLDivElement | undefined;
  let scrollListener: ScrollListener<HTMLElement> | undefined;
  const _init = () => {
    if (placeholder) {
      // 隐藏 placeholder 避免影响 element rect 的计算
      placeholder.style.display = 'none';
    }

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

    // 支持原生的 sticky 时，使用原生 sticky
    // TODO: 不修改 style
    const supportedSticky = !forceFixed && getSupportedKeyword();
    if (supportedSticky) {
      element.style.position = supportedSticky;
      element.style.top = top;
      const listener =
        scrollHandlers &&
        addScrollListener(container, {
          start,
          end,
          handlers: scrollHandlers,
          forceInViewBoundary,
        });
      return {
        reset: () => undefined,
        destroy: () => listener && listener.destroy(),
      };
    }

    /**
     * 以下为使用 js 模拟 sticky 的过程
     * 实际上该实现有许多限制，例如不能在该元素上使用 transform
     *
     * NOTE:
     * 之前遇到过 margin collapse 引起的 sticky 位置不对的问题，
     * 理论上可以通过给 container 添加一个足够小的 padding-top 来解决，
     * 在使用时也可以避免这种情况，故没有做相应的操作
     */

    const elementStyles = window.getComputedStyle(element);
    if (!initialPosition) {
      initialPosition = elementStyles.position;
    }

    const leftToContainer = elementRect.left - containerRect.left;
    const left = `${elementRect.left}px`;
    const width = `${elementRect.width}px`;
    const height = `${elementRect.height}px`;

    const setInView = () =>
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
    const setBefore = () => {
      setStyles(element, {
        width,
        height,
        left: `${leftToContainer}px`,
        top: '0',
        position: 'absolute',
        margin: '0',
        transform: 'none',
      });
    };
    const setAfter = () => {
      setStyles(element, {
        width,
        height,
        left: `${leftToContainer}px`,
        top: 'auto',
        bottom: '0',
        position: 'absolute',
        transform: 'none',
        margin: '0',
      });
    };

    // 当 element 使用 static/relative 定位时添加 placeholder 占位
    // 避免 element fixed 时对相邻的元素或父元素造成影响
    if (
      forceFixed ||
      initialPosition === 'static' ||
      initialPosition === 'relative'
    ) {
      if (!placeholder) {
        placeholder = document.createElement('div');
        initPlaceholder(placeholder, 'static', elementStyles);
        container.insertBefore(placeholder, element);
      } else {
        initPlaceholder(placeholder, 'static', elementStyles);
        placeholder.style.display = 'initial';
      }
      setBefore();
    }

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
              setInView();
              break;
            case 'after':
              setAfter();
              break;
            case 'before':
            default:
              setBefore();
          }
          if (scrollHandlers?.onStateChange) {
            scrollHandlers.onStateChange({ target, state, oldState });
          }
        },
        before: scrollHandlers?.before,
        inView: scrollHandlers?.inView,
        after: scrollHandlers?.after,
        always: scrollHandlers?.always,
      },
    });
  };

  element.setAttribute(CONFIGS.addedFlagAttr, CONFIGS.addedFlagAttr);

  _init();
  const reset = () => {
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

/**
 * `initStickyElement`的 markup 形式封装
 * @param selector
 * @param param1
 */
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
