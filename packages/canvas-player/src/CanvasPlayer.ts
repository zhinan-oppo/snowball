import { ImageSequence } from './ImageSequence';

export interface CanvasPlayerOptions {
  fitImageSize?: boolean;
  posterFrame?: false | 'first' | 'last' | number;
  alpha?: boolean;
  backgroundColor?: string;
}

interface SeekOptions {
  draw?: boolean;
}

export enum PlayMode {
  Normal,
  Reverse,
  Loop,
  Alternate,
}

type PlayListener = (options: { i: number }) => void;
export interface PlayOptions {
  fps?: number;
  waitOnLoading?: boolean;
  mode?: PlayMode;
  onUpdated?: PlayListener;
  onEnded?: PlayListener;
}

export class CanvasPlayer {
  static DEBUG = false;

  static createWithURLs(
    canvas: HTMLCanvasElement,
    urls: string[],
    options: CanvasPlayerOptions = {},
  ) {
    return new CanvasPlayer(
      canvas,
      ImageSequence.createFromURLs(urls),
      options,
    );
  }

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private frameRequest?: number = undefined;
  private sizeInitialized: boolean;

  private last: number;
  private cur: number;

  private playInterval?: number;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly sequence: ImageSequence,
    {
      fitImageSize = true,
      posterFrame = 'first',
      alpha = false,
      backgroundColor = 'black',
    }: CanvasPlayerOptions = {},
  ) {
    const ctx = canvas.getContext('2d', { alpha });
    if (!ctx) {
      throw new Error('CanvasRenderingContext2D unavailable');
    }
    this.canvas = canvas;
    this.ctx = ctx;

    this.sizeInitialized = !fitImageSize;
    this.last = -1;
    this.cur = -1;

    if (!alpha) {
      ctx.fillStyle = backgroundColor;
      this.clear();
    }
    if (posterFrame !== false) {
      this.seek(
        posterFrame === 'first'
          ? 0
          : posterFrame === 'last'
          ? this.sequence.length - 1
          : posterFrame,
      );
    }
  }

  load() {
    return this.sequence.load();
  }

  async seek(i: number, { draw = true }: SeekOptions = {}) {
    this.cur = i;
    if (draw) {
      return this.drawCurrentFrame();
    }
  }
  async seekPercent(p: number, options: SeekOptions) {
    return this.seek(Math.round(p * (this.sequence.length - 1)), options);
  }

  get playing() {
    return this.playInterval !== undefined;
  }

  pause() {
    window.clearInterval(this.playInterval);
    this.playInterval = undefined;
  }

  async play({
    fps = 24,
    mode = PlayMode.Normal,
    waitOnLoading = true,
    onUpdated,
    onEnded,
  }: PlayOptions = {}) {
    if (this.playInterval !== undefined) {
      window.clearInterval(this.playInterval);
    }

    let direction = mode === PlayMode.Reverse ? -1 : 1;

    let waiting = false;
    this.playInterval = window.setInterval(() => {
      if (waiting) {
        if (CanvasPlayer.DEBUG) {
          console.log(
            `Waiting to play ${this.cur}th:`,
            this.sequence.getImageAt(this.cur),
          );
        }
        return;
      }

      const emitUpdate = (i: number) => {
        if (onUpdated) {
          window.setTimeout(() => onUpdated({ i }), 0);
        }
      };
      const update = (i: number) => {
        if (waitOnLoading) {
          waiting = true;
          this.seek(i).then(() => {
            waiting = false;
            emitUpdate(i);
          });
        } else {
          this.seek(i).catch(console.error);
          emitUpdate(i);
        }
      };

      const next = this.cur + direction;
      const out = next >= this.sequence.length || next < 0;
      if (!out) {
        return update(next);
      }
      switch (mode) {
        case PlayMode.Loop:
          update(0);
          break;
        case PlayMode.Alternate:
          direction = -direction;
          update(direction > 0 ? 0 : this.sequence.length - 1);
          break;
        default:
          this.pause();
          if (onEnded) {
            window.setTimeout(() => onEnded({ i: next }), 0);
          }
          break;
      }
    }, 1000 / fps);
  }

  private async drawCurrentFrame() {
    if (this.cur === this.last) {
      return;
    }
    const image = this.sequence.getImageAt(this.cur);
    if (!image) {
      return;
    }

    this.last = this.cur;
    if (image instanceof window.Image) {
      return this.drawImage(image);
    }
    const waitingAt = this.cur;
    if (CanvasPlayer.DEBUG) {
      console.warn(
        `Try to draw the ${waitingAt}th image unloaded:`,
        this.sequence.getImageAt(waitingAt),
      );
    }

    try {
      this.drawImage(await image);
    } catch (e) {
      console.error(e);
    }
  }

  private drawImage(image: HTMLImageElement) {
    if (this.frameRequest !== undefined) {
      window.cancelAnimationFrame(this.frameRequest);
    }
    this.frameRequest = window.requestAnimationFrame(() => {
      this.frameRequest = undefined;
      if (!this.sizeInitialized) {
        this.canvas.width = image.width;
        this.canvas.height = image.height;
        this.sizeInitialized = true;
      }

      this.ctx.drawImage(
        image,
        0,
        0,
        image.width,
        image.height,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
    });
  }

  private clear() {
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
