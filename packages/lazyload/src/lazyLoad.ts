import Lazy from 'vanilla-lazyload';

import { Media, matchMedia } from '@zhinan-oppo/shared';

interface Options {
  /**
   * 当 elements 不是指定的元素队列时，
   * 只有在 root 中的元素才能被选择器选中
   * 作为懒加载的元素
   */
  root?: Element | Document;

  /**
   * 当为 string 类型时，elements 作为选择器选择懒加载的元素
   * 当为 NodeListOf<HTMLElement> 类型时，elements 即为懒加载的元素队列
   */
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
  ): void {
    return Lazy.load(element, options);
  }

  private lazyload: Lazy;
  private destroyed = false;

  private mediaMatched?: Media;

  constructor(private readonly options: Options) {
    this.lazyload = this.getLazy();
  }

  get media(): Media | undefined {
    return this.mediaMatched;
  }

  get loadingCount(): number {
    return this.lazyload.loadingCount;
  }

  get toLoadCount(): number {
    return this.lazyload.toLoadCount;
  }

  load(elements: { forEach: NodeListOf<HTMLElement>['forEach'] }): void {
    const options = toVanillaOptions(this.options, this.matchMedia());
    elements.forEach((ele) => LazyLoad.load(ele, options));
  }

  loadAll(): void {
    this.lazyload.loadAll();
  }

  update: Lazy['update'] = (elements) => {
    return this.lazyload.update(elements);
  };

  refresh(windowWidth?: number): void {
    const media = this.matchMedia(windowWidth);
    if (!this.destroyed && media === this.media) {
      return;
    }
    this.lazyload.destroy();
    this.lazyload = this.getLazy(media);
    this.destroyed = false;
  }

  destroy(): void {
    this.lazyload.destroy();
    this.destroyed = true;
  }

  private matchMedia(windowWidth?: number) {
    return matchMedia(this.options.medias, windowWidth);
  }

  private getLazy(media = this.matchMedia()) {
    this.mediaMatched = media;

    const {
      elements: elementsOrSelector,
      root = window.document,
    } = this.options;
    const options = toVanillaOptions(this.options, media);
    const { data_src, data_srcset, data_poster } = options;
    const defaultSelector = `[data-${data_src}],[data-${data_srcset}],[data-${data_poster}]`;
    return new Lazy(
      {
        ...options,
        callback_error: (...args) => console.error(args),
      },
      !(elementsOrSelector instanceof window.NodeList)
        ? root.querySelectorAll(elementsOrSelector || defaultSelector)
        : elementsOrSelector,
    );
  }
}

export { Options, LazyLoad };
