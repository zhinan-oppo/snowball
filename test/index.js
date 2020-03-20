import { init } from '@zhinan-oppo/lazyload';

document.addEventListener('DOMContentLoaded', event => {
  init({
    mediaConfig: [
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
  });
});
