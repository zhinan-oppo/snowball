declare module 'vanilla-lazyload' {
  export interface ILazyLoadOptions {
    elements_selector?: string;
    container?: HTMLElement;
    threshold?: number;
    thresholds?: string;
    data_src?: string;
    data_srcset?: string;
    data_sizes?: string;
    data_poster?: string;
    data_bg?: string;
    class_loading?: string;
    class_loaded?: string;
    class_applied?: string;
    class_error?: string;
    load_delay?: number;
    auto_unobserve?: boolean;
    callback_enter?: (elt: HTMLElement) => void;
    callback_exit?: (elt: HTMLElement) => void;
    callback_loading?: (elt: HTMLElement) => void;
    callback_loaded?: (elt: HTMLElement) => void;
    callback_error?: (elt: HTMLElement) => void;
    callback_finish?: () => void;
    use_native?: boolean;
    /* DEPRECATED, WILL BE REMOVED IN V. 15 */ callback_reveal?: (
      elt: HTMLElement,
    ) => void;
  }
  export default class LazyLoad {
    static load(
      element: HTMLElement,
      options?: Omit<ILazyLoadOptions, 'element_selectors'>,
    ): void;
    constructor(
      options?: ILazyLoadOptions,
      elements?: NodeListOf<HTMLElement> | HTMLElement[],
    );
    update: (elements?: NodeListOf<HTMLElement> | HTMLElement[]) => void;
    destroy: () => void;
    /** @deprecated*/
    load: (element: HTMLElement, force?: boolean) => void;
    loadAll: () => void;
    loadingCount: number;
    toLoadCount: number;
  }
}
