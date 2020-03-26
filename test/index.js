import { init } from '@zhinan-oppo/lazyload';

document.addEventListener('DOMContentLoaded', event => {
  init({
    medias: [
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

  const lzWithEvent = document.getElementById('lz-event');
  lzWithEvent.addEventListener('lazy-loaded', event => {
    console.log(event);
    lzWithEvent.textContent = `Loaded URL: ${event.detail}`;
    event.preventDefault(); // z-loaded-class 不会被添加
  });
});
