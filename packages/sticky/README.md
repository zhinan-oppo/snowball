# sticky

## Install

使用 yarn 安装

```
yarn add @zhinan-oppo/sticky
```

CommonJS 引用方式

```typescript
import { init } from "@zhinan-oppo/sticky";
```

## Instruction (Examples)

#### sticky 布局

粘性布局的 JS 实现方法。sticky-container 为布局容器，sticky-item 为具体的粘性元素，当 sticky-item 的 top 距离屏幕顶部为一定值时，sticky-item 变为 fixed，表现为粘在屏幕上。当 sticky-item 的底部和 sticky-container 的底部贴在一起时，sticky-item 变回 absolute，随 sticky-container 正常滚走。

- [sticky 布局介绍](https://developer.mozilla.org/en-US/docs/Web/CSS/position)

#### `initStickyItem`:手动初始化`.sticky-item`

```HTML
<div class="sticky-container">
  <div class="sticky-item">
  </div>
</div>
```

```typescript
initStickyItem(".sticky-item", {
  // scrollHandlers 实际上是监听在 container 上的
  scrollHandlers = {
    always: (dom, distance, total) => {}
  }
});
initStickyItem(stickyItem, {
  container = ".sticky-container",
  scrollHandlers = {
    always: (dom, distance, total) => {}
  }
});
```

#### `init`: 全部初始化

```HTML
<div class="sticky-container">
  <div class="sticky-item">
  </div>
</div>
```

```typescript
import { init } from "@zhinan-oppo/sticky";
document.addEventListener("DOMContentLoaded", event => {
  init();
});
```
