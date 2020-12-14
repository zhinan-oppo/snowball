import Lazy, { ILazyLoadOptions } from 'vanilla-lazyload';

import { matchMedia, Media } from '@zhinan-oppo/shared';

type DataSrcType = 'data_src' | 'data_srcset' | 'data_bg' | 'data_poster';

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
  elements?: string | NodeListOf<HTMLElement> | HTMLElement[];
  medias: Media[];

  /**
   * 在元素加载前会执行的回调函数，回调的返回结果(不为`undefined`时)会用来替换相应的属性值。
   * 以`移动端`的元素
   * ```html
   * <video data-src-360="abc-360.mp4" data-poster-360="abc.jpg" data-src-768="abc-768.mp4">
   * ```
   * 为例，会执行两次回调：
   * ```javascript
   * srcPreprocessor('abc-360.mp4', { name: 'data-src-360', type: 'data_src', element: video });
   * srcPreprocessor('poster-360.jpg', { name: 'data-poster-360', type: 'data_poster', element: video });
   * ```
   */
  srcPreprocessor?: (
    src: string | undefined,
    more: {
      name: string;
      type: DataSrcType;
      element: HTMLElement;
    },
  ) => string | undefined;

  container?: HTMLElement;
  src: string;
  srcset: string;
  poster: string;
  bg: string;
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
    bg,
    delay,
    classes = {},
    ...rest
  }: Omit<Options, 'elements' | 'medias'>,
  media?: Media,
): Partial<ILazyLoadOptions> {
  if (media) {
    const { alias } = media;
    const postfix = (str: string) => `${str}-${alias}`;
    src = postfix(src);
    poster = postfix(poster);
    bg = postfix(bg);
  }
  return {
    ...rest,
    data_src: src,
    data_srcset: srcset,
    data_poster: poster,
    data_bg: bg,
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
    options: ILazyLoadOptions,
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      const { callback_loaded, callback_error } = options;
      Lazy.load(element, {
        ...options,
        callback_loaded: () => {
          if (callback_loaded) {
            callback_loaded(element);
          }
          resolve(element);
        },
        callback_error: (e) => {
          if (callback_error) {
            callback_error(e);
          }
          reject(e);
        },
      });
    });
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

  load(elements: {
    forEach: NodeListOf<HTMLElement>['forEach'];
  }): Promise<number> {
    const options = toVanillaOptions(this.options, this.matchMedia());
    return new Promise((resolve) => {
      let total = 0;
      let cnt = 0;
      elements.forEach((ele) => {
        // 先执行预处理
        this.preprocessElementSources(ele, options);

        total += 1;
        LazyLoad.load(ele, options)
          .catch(() => undefined)
          .then(() => {
            cnt += 1;
            if (cnt === total) {
              resolve(cnt);
            }
          });
      });
    });
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
    const { data_src, data_srcset, data_poster, data_bg } = options;
    const defaultSelector = `[data-${data_src}],[data-${data_srcset}],[data-${data_poster}],[data-${data_bg}]`;
    return new Lazy(
      {
        ...options,
        callback_error: (...args) => console.error(args),
        callback_enter:
          this.options.srcPreprocessor &&
          ((element) => {
            this.preprocessElementSources(element, options);
          }),
      },
      typeof elementsOrSelector === 'undefined' ||
      typeof elementsOrSelector === 'string'
        ? root.querySelectorAll(elementsOrSelector || defaultSelector)
        : elementsOrSelector,
    );
  }

  private preprocessElementSources(
    element: HTMLElement,
    vanillaOptions: ReturnType<typeof toVanillaOptions>,
  ) {
    const { srcPreprocessor } = this.options;
    if (!srcPreprocessor) {
      return;
    }

    [
      'data_src' as const,
      'data_srcset' as const,
      'data_poster' as const,
      'data_bg' as const,
    ].forEach((optKey) => {
      const attr = vanillaOptions[optKey];
      if (attr) {
        const name = `data-${attr}`;
        const value = element.getAttribute(name) || undefined;

        const res = srcPreprocessor(value, { name, element, type: optKey });
        if (typeof res === 'string' && res !== value) {
          element.setAttribute(name, res);
        }
      }
    });
  }
}

export { Options, LazyLoad };
