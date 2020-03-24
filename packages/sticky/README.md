# sticky

## Install

使用 yarn 安装

```
yarn add @zhinan-oppo/sticky
```

引用方式

```typescript
import { initStickyElement, initAllBySelector } from '@zhinan-oppo/sticky';
```

## 接口

- `initStickyElement(element, options)`
  - 参数`element`是需要被设置为黏性布局的 `HTMLElement`
  - 参数`options`是可选的`object`，包含以下属性
    - `container`: 可选，默认为`element.offsetParent`
      - 如果`container`未指定且`element.offsetParent`为`null`，会报错，具体参见：[offsetParent](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent)
    - `scrollHandlers`: 可选，传递给`scrollHandle`的回调函数，具体参见：[scrollHandle](../scroll-handle#readme)
- `initAllBySelector(selector, root)`
  - 参数`selector`是可选的字符串，传递给`root.querySelectorAll`，所有被选中的 element 会逐一传入到`initStickyElement`中以默认参数初始化
  - 参数`root`是可选的 DOM 节点，默认为`window.document`

## Instruction (Examples)

#### sticky 布局

粘性布局的 JS 实现方法。sticky-container 为布局容器，sticky-item 为具体的粘性元素。

向下滚动时：
  - 当 sticky-container 的上边界触碰到屏幕顶部，sticky-item 变为 fixed，表现为粘在屏幕上
  - 当 sticky-item 的底部和 sticky-container 的底部贴在一起时，sticky-item 变为 absolute，随 sticky-container 正常滚走。

- [sticky 布局介绍](https://developer.mozilla.org/en-US/docs/Web/CSS/position)

#### `initStickyItem`:手动初始化`.sticky-item`

```HTML
<div class="sticky-container" style="position: relative">
  <div class="sticky-item" id="sticky">
  </div>
</div>
```

```typescript
const element = document.getElementById('sticky');
initStickyItem(element, {
  // scrollHandlers 实际上是监听在 container 上的
  scrollHandlers = {
    always: (dom, distance, total) => {},
  },
});
initStickyItem(element, {
  container = element.offsetParent,
  scrollHandlers = {
    always: (dom, distance, total) => {},
  },
});
```

#### `initAllBySelector`: 将所有 class 列表中带`sticky-item`的元素都设置为黏性布局

```HTML
<div class="sticky-container" style="position: relative">
  <div class="sticky-item">
  </div>
</div>
```

```typescript
import { initAllBySelector } from '@zhinan-oppo/sticky';
document.addEventListener('DOMContentLoaded', event => {
  initAllBySelector('.sticky-item');
});
```
