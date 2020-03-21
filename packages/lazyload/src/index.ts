import scrollHandle from '@zhinan-oppo/scroll-handle';
import $ from 'jquery';

export interface Media {
  name?: string;
  attr: string;
  px?: number;
  start?: number;
  end?: number;
}

export function getMedia(
  mediaConfig: Media[] = [
    {
      attr: 'z-src-mb',
      end: 568,
    },
    {
      attr: 'z-src-pc',
      start: 569,
    },
  ],
  defaultAttr: string,
): Media {
  const width =
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth;
  let result: Media = { attr: defaultAttr };
  mediaConfig.forEach(media => {
    const start = media.start || 0;
    const end = media.end || 20000;
    if (width >= start && width <= end) {
      result = media;
    }
  });
  return result;
}

export const lazyLoad = (
  dom: HTMLElement,
  mediaConfig: Media[],
  defaultAttr: string,
): void => {
  // eslint-disable-next-line eqeqeq
  const isBg = $(dom).attr('z-bg') != undefined;
  const removeHandle = scrollHandle({
    dom,
    handlers: {
      onStateChange: (dom, state): void => {
        if (state !== 'inView') {
          return;
        }
        // eslint-disable-next-line eqeqeq
        const src =
          $(dom).attr(getMedia(mediaConfig, defaultAttr).attr) ||
          $(dom).attr(defaultAttr);

        if (!src) {
          console.error('没有一个默认的 src 值');
          if (removeHandle) removeHandle();
          return;
        }

        if (isBg) {
          $(dom).css('background-image', `url(${src})`);
        } else {
          $(dom).attr('src', src);
        }

        if (removeHandle) removeHandle();
      },
    },
    start: { placement: 2 },
  });
};

export const init = ({
  mediaConfig = [
    {
      attr: 'z-src-mb',
      end: 568,
    },
    {
      attr: 'z-src-pc',
      start: 569,
    },
  ],
  defaultAttr = 'z-src',
}: {
  mediaConfig?: Media[];
  defaultAttr?: string;
} = {}): void => {
  const queryString = mediaConfig
    .map(({ attr }) => `[${attr}]`)
    .concat([`[${defaultAttr}]`])
    .join(',');
  $(queryString).each((i, dom) => {
    lazyLoad(dom, mediaConfig, defaultAttr);
  });
};
