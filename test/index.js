import { init } from '@zhinan-oppo/lazyload';

document.addEventListener('DOMContentLoaded', event => {
  init({
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
  });
});
