# scroll-handle

监听页面滚动, 判断元素是否处于页面可视范围内

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
type Placement = 'top' | 'center' | 'bottom' // viewport 的位置
type PlacementPercent = number // viewport 高度的倍数, 取值 0~1
type Distance = number // 距离 viewport 顶部的像素值, 单位(px)
type ScrollProps = {
  dom: Element
  distance: number // 当前滚动位置和 start 位置的距离(px)
  total: number // inView 的 start 到 end 的总距离(px)
}

scrollHandle(
  // 对象 DOM 元素
  dom: string | Element,
  options: {
    forceInViewBoundary: boolean = 'false' // inView -> before/after 的时候是否触发 handlers.inView() 回调
    // scroll 的一个参数, 是否等待脚本处理完毕才触发下次默认事件, 了解更多: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    passive: boolean = 'true'

    // 当 dom 的顶部进入到 viewport 的哪个位置(相对于 viewport 顶部)开始属于 inView 状态
    start: {
      percent: Placement | PlacementPercent
      distance: Distance // px
    } | Distance | Placement = 'bottom'

    // 当 dom 的底部离开 viewport 的哪个位置(相对于 viewport 顶部)开始、页面再向下时, 属于 after 状态
    end: {
      percent: Placement | PlacementPercent
      distance: Distance
    } | Distance | Placement = 'top'

    // 滚动时触发的 callback 函数
    handlers: {
      // 状态变化后触发
      onStateChange: ({
        dom,
        state,
        oldState
      }: {
        dom: Element
        state: 'before' | 'inView' | 'after'
        oldState: 'before' | 'inView' | 'after'
      }) => void
      inView: Function({ dom, distance, total }: ScrollProps)     // 在视图中会触发
      after: Function({ dom, distance, total }: ScrollProps)      // 在元素滚走后会触发
      before: Function({ dom, distance, total }: ScrollProps)     // 在尚未滚到该元素时触发
      always: Function({ dom, distance, total }: ScrollProps)     // 始终触发
    }
  }
): () => void
```

## Examples

```
用法示例:
scrollHandle(document.querySelector('#element'), {
  start: 120,
  handles: {
    onStateChange({ state, oldState }) {
      console.log({ state, oldState })
    },
    inView({ distance, total }) {
      const progress = distance / total
      console.log({ progress })
    }
  }
})

scrollHandle('#element', {
  start: { percent: '0.4' },
  handles: {
    onStateChange({ state, oldState }) {
      console.log({ state, oldState })
    },
    always({ distance, total }) {
      const progress = distance / total
      console.log({ progress })
    }
  }
})
```
