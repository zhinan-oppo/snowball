import { lazyLoad } from './lazyLoad';

export interface MediaConfig {
  name: string;
  px?: number;
  start?: number;
  end?: number;
}

export interface LazyLoadConfig {
  srcPrefix: string;
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
  srcPrefix: 'z-src',
  dstNameAttr: 'z-dst',
  bgFlag: 'z-bg',
  loadEarlyFlag: 'z-early',
  stateClasses: {
    default: '--lazy-load',
    loaded: '--lazy-loaded',
  },
  medias: [
    {
      name: 'mb',
      start: 0,
      end: 568,
    },
    {
      name: 'pc',
      start: 569,
    },
  ],
};

function getAttr(): string {
  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
  const { srcPrefix: prefix, medias } = config;

  for (const media of medias) {
    const { start = 0, end = 20000, name } = media;
    if (width >= start && width <= end) {
      return `${prefix}-${name}`;
    }
  }
  return prefix;
}
let attr = getAttr();

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
  attr = getAttr();
}

export function lazyLoadByAttributes(element: HTMLElement) {
  const url = element.getAttribute(attr);
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
  const elements = root.querySelectorAll<HTMLElement>(attr);
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
