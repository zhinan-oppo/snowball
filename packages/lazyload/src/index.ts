import { lazyLoad, LazyLoadOptions } from './lazyLoad';

export { lazyLoad, LazyLoadOptions };

export interface MediaConfig {
  attr: string;
  start?: number;
  end?: number;
}

export interface LazyLoadConfig {
  preferredURLAttr: string;
  defaultURLAttr: string;
  dstNameAttr: string;
  loadedClassAttr: string;
  eventFlag: string;
  bgFlag: string;
  loadEarlyFlag: string;
  medias: MediaConfig[];
}

const config: LazyLoadConfig = {
  preferredURLAttr: 'z-src-prefer',
  defaultURLAttr: 'z-src',
  dstNameAttr: 'z-dst',
  loadedClassAttr: 'z-loaded-class',
  eventFlag: 'z-event',
  bgFlag: 'z-bg',
  loadEarlyFlag: 'z-early',
  medias: [
    {
      attr: 'z-src-mb',
      start: 0,
      end: 568,
    },
    {
      attr: 'z-src-pc',
      start: 569,
    },
  ],
};

export function getURLAttr(
  {
    medias,
    defaultAttr,
  }: {
    medias: MediaConfig[];
    defaultAttr: string;
  } = { medias: config.medias, defaultAttr: config.defaultURLAttr },
): string {
  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;

  for (const media of medias) {
    const { start = 0, end = 20000, attr } = media;
    if (width >= start && width <= end) {
      return attr;
    }
  }
  return defaultAttr;
}
let urlAttr = getURLAttr();
export function resetURLAttr() {
  urlAttr = getURLAttr();
}

export function configure({ medias, ...attrConfig }: Partial<LazyLoadConfig>) {
  if (medias) {
    config.medias = medias;
  }
  if (attrConfig) {
    (Object.keys(attrConfig) as Array<keyof typeof attrConfig>).forEach(key => {
      const conf = attrConfig[key];
      if (conf) {
        config[key] = conf;
      }
    });
  }
  urlAttr = getURLAttr();
}

export function lazyLoadByAttributes(element: HTMLElement) {
  const url =
    element.getAttribute(config.preferredURLAttr) ||
    element.getAttribute(urlAttr) ||
    element.getAttribute(config.defaultURLAttr);
  if (!url) {
    return;
  }
  const {
    eventFlag,
    bgFlag,
    dstNameAttr,
    loadEarlyFlag,
    loadedClassAttr,
  } = config;
  const shouldEmitEvent = element.hasAttribute(eventFlag);
  const isBackgroundImage = element.hasAttribute(bgFlag);
  const loadEarly = element.hasAttribute(loadEarlyFlag);
  const loadedClass = element.getAttribute(loadedClassAttr);
  const attrName =
    (!isBackgroundImage && element.getAttribute(dstNameAttr)) || 'src';

  const removeHandle = lazyLoad(element, url, {
    attrName,
    loadEarly,
    isBackgroundImage,
    onLoaded: () => {
      let preventDefault = false;
      if (shouldEmitEvent) {
        const event = new window.CustomEvent('lazy-loaded', {
          detail: url,
          bubbles: false,
          cancelable: true,
        });
        if (!element.dispatchEvent(event)) {
          preventDefault = true;
        }
      }
      if (!preventDefault && loadedClass) {
        element.classList.add(...loadedClass.split(' '));
      }
    },
  });
  return removeHandle;
}

export function initByAttributes(root = window.document) {
  const elements = root.querySelectorAll<HTMLElement>(
    [urlAttr, config.defaultURLAttr, config.preferredURLAttr]
      .map(url => `[${url}]`)
      .join(','),
  );
  const controllers: Array<ReturnType<typeof lazyLoadByAttributes>> = [];
  elements.forEach(element => {
    controllers.push(lazyLoadByAttributes(element));
  });
  const destroy = () => {
    for (let i = 0; i < controllers.length; i += 1) {
      const removeHandle = controllers[i];
      if (removeHandle) {
        removeHandle();
        controllers[i] = undefined;
      }
    }
  };
  const reset = () => {
    resetURLAttr();
    destroy();
    elements.forEach((element, i) => {
      controllers[i] = lazyLoadByAttributes(element);
    });
  };

  return { reset, destroy };
}

export function init(config?: Partial<LazyLoadConfig>, root = window.document) {
  if (config) {
    configure(config);
  }
  return initByAttributes(root);
}
