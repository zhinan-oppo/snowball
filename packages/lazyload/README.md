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

### 默认配置

```typescript
interface MediaConfig {
  attr: string;      # 尺寸对应的属性名
  start?: number;    # 最小屏幕宽度，默认为 0
  end?: number;      # 最大屏幕宽度，默认为无限大
}
export interface LazyLoadConfig {
  defaultURLAttr: string;
  dstNameAttr: string;
  loadedClassAttr: string;
  eventFlag: string;
  bgFlag: string;
  loadEarlyFlag: string;
  medias: MediaConfig[];
}
const config: LazyLoadConfig = {
  defaultURLAttr: 'z-src',
  dstNameAttr: 'z-dst',
  loadedClassAttr: 'z-loaded-class',
  eventFlag: 'z-event',
  bgFlag: 'z-bg',
  loadEarlyFlag: 'z-early',
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
};

```

- `defaultURLAttr`: 默认的 URL 属性名，medias 中未定义相应的 attr 时使用该值，默认为`'z-src'`
- `dstNameAttr`: 默认给 element 添加 src 属性，通过 dstNameAttr 可以修改为其它属性
  - dstNameAttr 默认为`'z-dst'`
  - 例如，`<a z-src="/path/to.png" z-dst="href" z-early>`会被加载为`<a href="/path/to.png">`
- `loadedClassAttr`: 通过该属性设置懒加载后添加的类名，可以通过`' '`隔开多个类名
- `eventFlag`: 通过该属性判断是否在懒加载完成后触发`lazy-loaded`事件，可以通过`element.addEventListener('lazy-loaded', ...)`监听
  - `event.detail` 为实际 load 的`URL`
  - 注意：如果添加了`z-early`，事件会在初始化的时候就 dispatch，在这之后添加的处理函数无法被触发
- `bgFlag`: 通过该属性判断是否设置为背景图片
- `loadEarlyFlag`: 通过该属性判断是否在**初始化时就加载**
- `medias`: 屏幕宽度查询条件

### 修改配置

```typescript
function configure(config: Partial<LazyLoadConfig>): void;
```

### 根据配置通过 DOM 属性初始化 element

```typescript
function init(config?: Partial<LazyLoadConfig>, root = window.document): void;
```

- 其中`init`相当于`configure(config)` + `initByAttributes(root)`

```typescript
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
});
```

### 原理

根据尺寸选择不同的标签值，在滚动过程中，加到`src`（或自定义）属性值里

### 默认配置下的使用示例

#### 基础使用

```html
<div z-src-mb="example-mb.png" z-src-pc="example-pc.png"></div>
```

#### 加载背景图片

```html
<div z-bg z-src-mb="example-mb.png" z-src-pc="example-pc.png"></div>
```

#### 在初始化时立即加载

```html
<div z-early z-src-mb="example-mb.png" z-src-pc="example-pc.png"></div>
```

#### 将 url 加载到属性 href

```html
<a z-dst="href" z-early z-src="example-mb.png" z-src-pc="example-pc.png"></a>
```

将得到

```html
<a href="example-pc.png"></a>
```

#### 懒加载后添加`lazy-loaded`类名

```html
<div
  z-loaded-class="lazy-loaded"
  z-src-mb="example-mb.png"
  z-src-pc="example-pc.png"
></div>
```

在懒加载后将得到

```html
<div class="lazy-loaded" src="example-mb.png"></div>
```

#### 触发`lazy-loaded`事件

##### HTML

```html
<div
  z-event
  z-src-mb="example-mb.png"
  z-src-pc="example-pc.png"
  id="element"
></div>
```

##### js

```javascript
const element = document.getElementById('element');
element.addEventListener('lazy-loaded', event => {
  console.log(`Loaded URL: ${event.detail}`);
  event.preventDefault(); // 可以阻止 z-loaded-class 被添加
});
```
