# scroll-handle

## Install

使用 yarn 安装

```
yarn add @zhinan-oppo/canvas-player
```

```
import { CanvasPlayer } from '@zhinan-oppo/canvas-player';
```

## Usage

### CanvasPlayer

#### `constructor(canvas, imageURLs, options?: CanvasPlayerOptions)`

- `canvas`: `HTMLCanvasElement`，用于绘制图片的 canvas
- `imageURLs`: `string[]` 一组图片序列的 URL
- `options`: 非必需
  - `fitImageSize`: `boolean`，默认`true`
    - 是否将 canvas 的`width`和`height`设置成第一张加载完成的图片的`width`和`height`
  - `posterFrame`: `false|'first'|'last'|number`，默认`'first'`
    - `'first'|'last'`: 默认显示第一张/最后一张图片
    - `number`: 默认显示`imageURLs`中对应的图片

### `load(): Promise<HTMLImageElement[]>`

- 加载所有图片

### `seek(i, options): Promise<void>`

- `i`: `0 <= i < imageURLs.length`
- `options`: 非必需
  - `draw`: 是否将当前指定的图片绘制到 canvas 中，默认`true`

### `seekPercent(p, options): Promise<void>`

- 相当于`seek(Math.round(p * (imageURLs.length - 1)), options)`

### `play(options): Promise<void>`

- 播放序列帧
- `options`:

  - `fps`: `number`，每秒播放图片的张数，默认值 24
  - `mode`: `enum PlayMode`，默认值`Normal`
    - `Normal`: **顺序**播放序列帧到**结尾**并停止
    - `Reverse`: **逆序**播放序列帧到**开头**并停止
    - `Loop`: **顺序**播放序列帧到结尾后**从头开始**
    - `Alternate`: **顺序**播放序列帧到结尾后**逆序播放**，循环往复
  - `waitingOnLoading`: `boolean`，是否等待图片加载，默认`true`
    - `true`: 等待直到要绘制的图片加载完成
    - `false`: 不等待图片加载，下一帧图片可绘制时直接跳过正在加载的图片
  - `onUpdated`: `(i: number) => void`，图片绘制完成后的回调，参数`i`为所绘制的图片在`imageURLs`中的索引
  - `onEnded`: `(i: number) => void`，播放结束的回调
    - 当`mode`为`PlayMode.Normal`时，`i === -1`
    - 当`mode`为`PlayMode.Reverse`时，`i === imageURLs.length`
    - 当`mode`为`PlayMode.Loop`或`PlayMode.Alternate`时，`onEnded`不会被触发

### `pause(): void`

- 暂停

### `playing`: `boolean`

- 是否在播放

## Example

```typescript
import { CanvasPlayer, PlayMode } from '@zhinan-oppo/canvas-player';

const canvas = document.getElementById('canvas');
const urls = ['https://example.com/0.png', 'https://example.com/1.png'];
const player = new CanvasPlayer(canvas, urls);
player.play({
  mode: PlayMode.Alternate,
  onUpdated: i => {
    console.log(i);
  },
});
```

```html
<div>
  <canvas id="canvas" />
</div>
```
