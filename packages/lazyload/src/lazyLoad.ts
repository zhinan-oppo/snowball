import Lazy, { ILazyLoadOptions } from 'vanilla-lazyload';

import { matchMedia, Media, Size } from '@zhinan-oppo/shared';
import { getDataAttrName, isImage, isVideo } from './utils';
import { Exception } from './Exception';

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
  /**
   * NOTE: options.callback_loaded 和 options.callback_error 会被覆盖，请使用返回的 Promise 结果
   *
   * @throws {Exception}
   */
  static load(
    element: HTMLElement,
    options: ILazyLoadOptions,
    srcPreprocessor?: Options['srcPreprocessor'],
  ): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
      // 先执行预处理
      this.preprocessElementSources(element, options, srcPreprocessor);

      // 检查 Image 的 src/srcset 以及 Video 的 src 属性是否设置，未设置则直接认为加载失败
      // TODO: 支持 Picture/Video + Source 的形式
      if (
        (isImage(element) &&
          !element.getAttribute(getDataAttrName(options.data_src)) &&
          !element.getAttribute(getDataAttrName(options.data_srcset))) ||
        (isVideo(element) &&
          !element.getAttribute(getDataAttrName(options.data_src)))
      ) {
        const error = new Exception(
          `${options.data_src} or ${options.data_srcset} is necessary`,
          element,
        );
        return reject(error);
      }

      Lazy.load(element, {
        ...options,
        callback_loaded: () => {
          resolve(element);
        },
        callback_error: () => {
          reject(
            new Exception(
              'vanilla-lazyload error: see console output for details',
              element,
            ),
          );
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
  }): Promise<HTMLElement>[] {
    const options = toVanillaOptions(this.options, this.matchMedia());
    const promises: Promise<HTMLElement>[] = [];
    elements.forEach((ele) =>
      promises.push(LazyLoad.load(ele, options, this.options.srcPreprocessor)),
    );
    return promises;
  }

  loadAll(): void {
    this.lazyload.loadAll();
  }

  update: Lazy['update'] = (elements) => {
    return this.lazyload.update(elements);
  };

  refresh(windowSize?: Size): void {
    const media = this.matchMedia(windowSize);
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

  private matchMedia(windowSize?: Size) {
    return matchMedia(this.options.medias, windowSize);
  }

  private getLazy(media = this.matchMedia()) {
    this.mediaMatched = media;

    const {
      srcPreprocessor,
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
          srcPreprocessor &&
          ((element) => {
            LazyLoad.preprocessElementSources(
              element,
              options,
              srcPreprocessor,
            );
          }),
      },
      typeof elementsOrSelector === 'undefined' ||
      typeof elementsOrSelector === 'string'
        ? root.querySelectorAll(elementsOrSelector || defaultSelector)
        : elementsOrSelector,
    );
  }

  private static preprocessElementSources(
    element: HTMLElement,
    vanillaOptions: ReturnType<typeof toVanillaOptions>,
    callback?: Options['srcPreprocessor'],
  ) {
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

        const res =
          callback && callback(value, { name, element, type: optKey });
        if (typeof res === 'string' && res !== value) {
          element.setAttribute(name, res);
        }
      }
    });
  }
}

export { Options, LazyLoad };
