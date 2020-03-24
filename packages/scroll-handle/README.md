# scroll-handle

## Install

使用 yarn 安装

```
yarn add @zhinan-oppo/scroll-handle
```

引用方式

```
import { scrollHandle } from '@zhinan-oppo/scroll-handle';
```

## Instruction (Examples)

```typescript
scrollHandle(options: {
  dom: string | Element;                                   // 对象 DOM 元素
  // 当 dom 进入到相对于 viewport 顶部的哪个位置开始属于 inView 状态：`percent * viewportHeight + distance`
  start: {
    percent: 'top' | 'center' | 'bottom' | number;   // viewport 高度的倍数，top center bottom 分别对应 0 0.5 1, // 默认为 'bottom'
    distance: number;                                  // px
  }；
  // 与 start 类似，确定状态变为 after 的时机
  end: {
    percent: 'top' | 'center' | 'bottom' | number;  // 默认为 'top'
    distance: number;
  };
  // 滚动时触发的 callback 函数
  handlers: {
    onStateChange: (
      dom: Element;
      newState: 'before' | 'inView' | 'after',
      oldState: 'before' | 'inView' | 'after'
    ) => void;    // 状态变化后触发
    inView: Function(dom, distance, totalDistance)     // 在视图中会触发
    after: Function(dom, distance, totalDistance)      // 在元素滚走后会触发
    before: Function(dom, distance, totalDistance)     // 在尚未滚到该元素时触发
    always: Function(dom, distance, totalDistance)     // 始终触发
  }
}): () => void;
```
