import { scrollHandle, ScrollHandlers } from '@zhinan-oppo/scroll-handle';

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
  ] as ChangeableStyles[]).forEach(k => {
    element.style[k] = styles[k] || '';
  });
}

export interface StickyOption {
  container?: HTMLElement;
  scrollHandlers?: ScrollHandlers;
}

const CONFIGS = {
  debug: false,
  addedFlagAttr: 'z-sticky-added',
};
type Configs = typeof CONFIGS;
export function configure<T extends keyof Configs>(key: T, value: Configs[T]) {
  CONFIGS[key] = value;
}

export function initStickyElement(
  element: HTMLElement,
  { container: _container, scrollHandlers = {} }: StickyOption = {},
): () => void {
  let container: Element;
  if (!_container) {
    const parent = element.offsetParent;
    if (!parent) {
      throw new Error(
        'The container is not set explicitly; The element should have a NOT NULL offsetParent; See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent',
      );
    }
    container = parent;
  } else {
    container = _container;
  }
  element.setAttribute(CONFIGS.addedFlagAttr, CONFIGS.addedFlagAttr);
  element.style.position = 'relative';

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  if (CONFIGS.debug) {
    // eslint-disable-next-line no-console
    console.debug({
      elementRect,
      containerRect,
      element,
      container,
    });
  }

  const bottomToContainerTop = elementRect.bottom - containerRect.top;
  const top = `${elementRect.top - containerRect.top}px`;
  const left = `${elementRect.left}px`;
  const width = `${elementRect.width}px`;
  const height = `${elementRect.height}px`;

  const removeHandle = scrollHandle(container, {
    start: 'top',
    end: { distance: bottomToContainerTop },
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
              left: `${element.getBoundingClientRect().left -
                container.getBoundingClientRect().left}px`,
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
        if (CONFIGS.debug) {
          const position =
            state === 'inView' ? 'fixed' : state === 'after' ? 'absolute' : '';
          // eslint-disable-next-line no-console
          console.debug(`sticky item: ${position}`, element);
        }
        if (scrollHandlers.onStateChange) {
          scrollHandlers.onStateChange(doms, state, oldState);
        }
      },
    },
  });
  const destroy = (): void => {
    if (removeHandle) {
      removeHandle();
    }
  };
  return destroy;
}

export function initAllBySelector(
  selector: string,
  root = window.document,
): void {
  root.querySelectorAll<HTMLElement>(selector).forEach(element => {
    if (!element.hasAttribute(CONFIGS.addedFlagAttr)) {
      initStickyElement(element);
    }
  });
}
