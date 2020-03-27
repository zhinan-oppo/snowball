import { scrollHandle } from '@zhinan-oppo/scroll-handle';

interface LoadOptions {
  attrName?: string;
  isBackgroundImage?: boolean;
  onLoaded?: () => void;
}

export interface LazyLoadOptions extends LoadOptions {
  loadEarly?: boolean;
}

function load(
  element: HTMLElement,
  url: string,
  {
    attrName = 'src',
    isBackgroundImage: isBG = false,
    onLoaded,
  }: LoadOptions = {},
) {
  if (!isBG) {
    element.setAttribute(attrName, url);
  } else {
    element.style.backgroundImage = `url(${url})`;
  }
  if (onLoaded) {
    onLoaded();
  }
}

export function lazyLoad(
  element: HTMLElement,
  url: string,
  { loadEarly, ...options }: LazyLoadOptions,
) {
  if (loadEarly) {
    load(element, url, options);
  } else {
    const removeHandle = scrollHandle(element, {
      handlers: {
        onStateChange(_, state) {
          if (state === 'inView') {
            load(element, url, options);
            removeHandle();
          }
        },
      },
    });
  }
}
