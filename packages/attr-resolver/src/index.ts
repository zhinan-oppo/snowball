import { matchMedia, Media } from '@zhinan-oppo/shared';

export interface LazyLoadConfig {
  value: string;
  attr: string;

  medias: Media[];
}

const config: LazyLoadConfig = {
  value: 'm-val',
  attr: 'm-attr',
  medias: [],
};

export function getValueAttr(
  {
    medias,
    valueAttr,
  }: {
    medias: Media[];
    valueAttr: string;
  } = { medias: config.medias, valueAttr: config.value },
): string {
  const media = matchMedia(medias);
  if (media) {
    return `${valueAttr}-${media.alias}`;
  }
  return valueAttr;
}
let valueAttr = getValueAttr();
export function resetValueAttr() {
  valueAttr = getValueAttr();
}

export function configure({ medias, ...attrConfig }: Partial<LazyLoadConfig>) {
  if (medias) {
    config.medias = medias;
  }
  if (attrConfig) {
    (Object.keys(attrConfig) as Array<keyof typeof attrConfig>).forEach(
      (key) => {
        const conf = attrConfig[key];
        if (conf) {
          config[key] = conf;
        }
      },
    );
  }
  valueAttr = getValueAttr();
}

export function resolve(element: HTMLElement) {
  const value =
    element.getAttribute(valueAttr) || element.getAttribute(config.value);
  const { attr: dstNameAttr } = config;

  const attrName = element.getAttribute(dstNameAttr) || valueAttr;
  element.setAttribute(attrName, value || '');
}

export function resolveAll(root = window.document) {
  root
    .querySelectorAll<HTMLElement>(
      [valueAttr, config.value].map((url) => `[${url}]`).join(','),
    )
    .forEach((element) => resolve(element));
}

export function configureAndResolve(
  config?: Partial<LazyLoadConfig>,
  root = window.document,
) {
  if (config) {
    configure(config);
  }
  return resolveAll(root);
}
