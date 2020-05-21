import Lazy from 'vanilla-lazyload';

import { Media, matchMedia } from '@zhinan-oppo/shared';

interface Options {
  elements?: string | NodeListOf<HTMLElement>;
  medias: Media[];

  container?: HTMLElement;
  src: string;
  srcset: string;
  poster: string;
  threshold?: number;
  thresholds?: string;
  delay?: number;
  classes?: {
    loaded?: string;
    loading?: string;
    applied?: string;
    error?: string;
  };
}

/* eslint-disable @typescript-eslint/camelcase */
function toVanillaOptions(
  {
    src,
    poster,
    srcset,
    delay,
    classes = {},
    ...rest
  }: Omit<Options, 'elements' | 'medias'>,
  media?: Media,
) {
  if (media) {
    const { alias } = media;
    const postfix = (str: string) => `${str}-${alias}`;
    src = postfix(src);
    poster = postfix(poster);
  }
  return {
    ...rest,
    data_src: src,
    data_srcset: srcset,
    data_poster: poster,
    load_delay: delay,
    class_loading: classes.loading,
    class_loaded: classes.loaded,
    class_applied: classes.applied,
    class_error: classes.error,
  };
}

class LazyLoad {
  static load(
    element: HTMLElement,
    options: ReturnType<typeof toVanillaOptions>,
  ) {
    return Lazy.load(element, options);
  }

  private lazyload: Lazy;
  private destroyed = false;

  private mediaMatched?: Media;

  constructor(private readonly options: Options) {
    this.lazyload = this.getLazy();
  }

  get media() {
    return this.mediaMatched;
  }

  get loadingCount() {
    return this.lazyload.loadingCount;
  }

  get toLoadCount() {
    return this.lazyload.toLoadCount;
  }

  load(elements: { forEach: NodeListOf<HTMLElement>['forEach'] }) {
    const options = toVanillaOptions(this.options, this.matchMedia());
    elements.forEach((ele) => LazyLoad.load(ele, options));
  }

  loadAll() {
    this.lazyload.loadAll();
  }

  update: Lazy['update'] = (elements) => {
    return this.lazyload.update(elements);
  };

  refresh(windowWidth?: number) {
    const media = this.matchMedia(windowWidth);
    if (!this.destroyed && media === this.media) {
      return;
    }
    this.lazyload.destroy();
    this.lazyload = this.getLazy(media);
    this.destroyed = false;
  }

  destroy() {
    this.lazyload.destroy();
    this.destroyed = true;
  }

  private matchMedia(windowWidth?: number) {
    return matchMedia(this.options.medias, windowWidth);
  }

  private getLazy(media = this.matchMedia()) {
    this.mediaMatched = media;

    const { elements } = this.options;
    const options = toVanillaOptions(this.options, media);
    const { data_src, data_srcset, data_poster } = options;
    return new Lazy(
      {
        ...options,
        elements_selector:
          typeof elements === 'string'
            ? elements
            : `[data-${data_src}],[data-${data_srcset}],[data-${data_poster}]`,
        callback_error: (...args) => console.error(args),
      },
      elements instanceof window.NodeList ? elements : undefined,
    );
  }
}

export { Options, LazyLoad };
