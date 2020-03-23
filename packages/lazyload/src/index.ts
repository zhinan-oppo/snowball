import { lazyLoad } from './lazyLoad';

export interface MediaConfig {
  attr: string;
  start?: number;
  end?: number;
}

export interface LazyLoadConfig {
  defaultURLAttr: string;
  dstNameAttr: string;
  bgFlag: string;
  loadEarlyFlag: string;
  stateClasses: {
    default: string;
    loaded: string;
  };
  medias: MediaConfig[];
}
const config: LazyLoadConfig = {
  defaultURLAttr: 'z-src',
  dstNameAttr: 'z-dst',
  bgFlag: 'z-bg',
  loadEarlyFlag: 'z-early',
  stateClasses: {
    default: '--lazy-load',
    loaded: '--lazy-loaded',
  },
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

function getURLAttr(): string {
  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
  const { defaultURLAttr, medias } = config;

  for (const media of medias) {
    const { start = 0, end = 20000, attr } = media;
    if (width >= start && width <= end) {
      return attr;
    }
  }
  return defaultURLAttr;
}
let attr = getURLAttr();

export function configure({
  medias,
  stateClasses,
  ...attrConfig
}: Partial<LazyLoadConfig>) {
  if (medias) {
    config.medias = medias;
  }
  if (stateClasses) {
    const { default: defaultClass, loaded } = stateClasses;
    if (defaultClass) {
      config.stateClasses.default = defaultClass;
    }
    if (loaded) {
      config.stateClasses.loaded = loaded;
    }
  }
  if (attrConfig) {
    (Object.keys(attrConfig) as Array<keyof typeof attrConfig>).forEach(key => {
      const conf = attrConfig[key];
      if (conf) {
        config[key] = conf;
      }
    });
  }
  attr = getURLAttr();
}

export function lazyLoadByAttributes(element: HTMLElement) {
  const url =
    element.getAttribute(attr) || element.getAttribute(config.defaultURLAttr);
  if (!url) {
    return;
  }
  const { bgFlag, dstNameAttr, loadEarlyFlag, stateClasses } = config;
  const isBackgroundImage = element.hasAttribute(bgFlag);
  const loadEarly = element.hasAttribute(loadEarlyFlag);
  const attrName =
    (!isBackgroundImage && element.getAttribute(dstNameAttr)) || 'src';
  if (!loadEarly) {
    element.classList.add(stateClasses.default);
  }
  lazyLoad(element, url, {
    attrName,
    loadEarly,
    isBackgroundImage,
    onLoaded: () => {
      if (!loadEarly) {
        element.classList.remove(stateClasses.default);
      }
      element.classList.add(stateClasses.loaded);
    },
  });
}

export function initByAttributes(root = window.document) {
  const elements = root.querySelectorAll<HTMLElement>(
    `[${attr}],[${config.defaultURLAttr}]`,
  );
  elements.forEach(element => {
    lazyLoadByAttributes(element);
  });
}

export function init(config?: Partial<LazyLoadConfig>, root = window.document) {
  if (config) {
    configure(config);
  }
  initByAttributes(root);
}
