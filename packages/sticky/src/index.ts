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

function isStatic(position: string) {
  return (
    position !== 'relative' && position !== 'absolute' && position !== 'fixed'
  );
}

export function initStickyElement(
  element: HTMLElement,
  { container: _container, scrollHandlers = {} }: StickyOption = {},
) {
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

    if (removeHandle) {
      removeHandle();
    }
    removeHandle = scrollHandle(container, {
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
  const containerStyles = window.getComputedStyle(container);
  element.setAttribute(CONFIGS.addedFlagAttr, CONFIGS.addedFlagAttr);
  if (isStatic(containerStyles.position)) {
    container.style.position = 'relative';
  }
  _init();
  const reset = () => {
    element.style.position = initialPosition;
    setStyles(element);
    _init();
  };

  const destroy = (): void => {
    if (removeHandle) {
      removeHandle();
      removeHandle = undefined;
    }
  };

  return { destroy, reset };
}

export function initBySelector(selector: string, root = window.document) {
  const controllers: Array<ReturnType<typeof initStickyElement>> = [];
  root.querySelectorAll<HTMLElement>(selector).forEach(element => {
    if (!element.hasAttribute(CONFIGS.addedFlagAttr)) {
      controllers.push(initStickyElement(element));
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
