# 懒加载

## Install

使用 yarn 安装

```
yarn add @zhinan-oppo/lazyload
```

CommonJS 引用方式

```
import { init } from '@zhinan-oppo/lazyload';
```

## Usage

### 初始化

`init(mediaConfig: Media[], defaultAttr: string)`，其中 Media 的类型定义为：

```typescript
interface Media {
  name?: string;     # 尺寸的名称
  attr: string;      # 尺寸的标签属性值
  px?: number;       # 尺寸的静态资源后缀尺寸值
  start?: number;    # 最小屏幕宽度，默认为 0
  end?: number;      # 最大屏幕宽度，默认为无限大
}
```

defaultAttr 为如果未匹配到当前尺寸下的标签属性，默认标签属性名

```typescript
import { init } from "@zhinan-oppo/lazyload";

document.addEventListener("DOMContentLoaded", event => {
  init({
    mediaConfig: [
      {
        attr: "z-src-mb",
        start: 0,
        end: 568
      },
      {
        attr: "z-src-pc",
        start: 569
      }
    ],
    defaultAttr: "z-src"
  });
});
```

### 原理

根据尺寸选择不同的标签值，在滚动过程中，加到 src 属性值里

### 背景图片

增加标签属性 `z-bg`

```html
<div z-bg z-src="example.png"></div>
```
