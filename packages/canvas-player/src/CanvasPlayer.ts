import { ImageSequence } from './ImageSequence';

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
  /**
   * 播放延迟时间，单位毫秒
   */
  delay?: number;
}

export interface CanvasPlayerOptions {
  fitImageSize?: boolean;
  posterFrame?: false | 'first' | 'last' | number;
  alpha?: boolean;
  backgroundColor?: string;
  shouldClear?: boolean;
  defaultPlayOptions?: PlayOptions;
}

export class CanvasPlayer {
  static DEBUG = false;

  static createWithURLs(
    canvas: HTMLCanvasElement,
    urls: string[],
    options: CanvasPlayerOptions = {},
  ): CanvasPlayer {
    return new CanvasPlayer(
      canvas,
      ImageSequence.createFromURLs(urls),
      options,
    );
  }

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly alpha: boolean;
  private readonly shouldClear: boolean;

  private frameRequest?: number = undefined;
  private sizeInitialized: boolean;

  private readonly playingState: {
    cur: number;
    last: number;
    options: Partial<PlayOptions>;
    interval?: number;
    delayedTimeout?: number;
  };

  constructor(
    canvas: HTMLCanvasElement,
    private readonly sequence: ImageSequence,
    {
      fitImageSize = true,
      posterFrame = 'first',
      alpha = false,
      backgroundColor = 'black',
      shouldClear = false,
      defaultPlayOptions,
    }: CanvasPlayerOptions = {},
  ) {
    const ctx = canvas.getContext('2d', { alpha });
    if (!ctx) {
      throw new Error('CanvasRenderingContext2D unavailable');
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.alpha = alpha;
    this.shouldClear = shouldClear;
    this.playingState = {
      cur: -1,
      last: -1,
      options: defaultPlayOptions || {},
    };

    this.sizeInitialized = !fitImageSize;

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

  /**
   * 加载序列帧
   */
  load(): Promise<HTMLImageElement[]> {
    return this.sequence.load();
  }

  /**
   * 跳转到指定帧
   * @param i
   * @param param1
   */
  async seek(i: number, { draw = true }: SeekOptions = {}): Promise<void> {
    this.playingState.cur = i;
    if (draw) {
      return this.drawCurrentFrame();
    }
  }
  /**
   * 按百分比跳转到指定帧
   * @param p
   * @param options
   */
  async seekPercent(p: number, options: SeekOptions): Promise<void> {
    return this.seek(Math.round(p * (this.sequence.length - 1)), options);
  }

  /**
   * 是否在播放
   */
  get playing(): boolean {
    return this.playingState.interval !== undefined;
  }

  /**
   * 是否未播放：`!this.playing`
   */
  get paused(): boolean {
    return !this.playing;
  }

  /**
   * 当前指向的帧索引
   */
  get cur(): number {
    return this.playingState.cur;
  }

  /**
   * 序列帧的长度
   */
  get seqLength(): number {
    return this.sequence.length;
  }

  /**
   * 暂停播放
   */
  pause(): void {
    window.clearInterval(this.playingState.interval);
    this.playingState.interval = undefined;
  }

  /**
   * 播放序列帧
   * 传入的 options 会被记住，下次以相同的参数调用可以省略
   * @param options
   */
  async play(options: PlayOptions = this.playingState.options): Promise<void> {
    const { playingState } = this;

    if (playingState.interval !== undefined) {
      window.clearInterval(playingState.interval);
    }
    if (playingState.delayedTimeout !== undefined) {
      window.clearTimeout(playingState.delayedTimeout);
      playingState.delayedTimeout = undefined;
    }

    playingState.options = options;
    const {
      fps = 24,
      mode = PlayMode.Normal,
      waitOnLoading = true,
      onUpdated,
      onEnded,
      delay,
    } = options;

    let reversed = mode === PlayMode.Reverse;

    let waiting = false;
    const play = (isDelayed = false) => {
      if (waiting) {
        if (CanvasPlayer.DEBUG) {
          console.log(
            `Waiting to play ${playingState.cur}th:`,
            this.sequence.getImageAt(playingState.cur),
          );
        }
        return;
      }

      const callOnUpdated = (i: number) => {
        if (onUpdated) {
          window.setTimeout(() => onUpdated({ i }), 0);
        }
      };
      const update = (i: number) => {
        if (waitOnLoading) {
          waiting = true;
          this.seek(i).then(() => {
            waiting = false;
            callOnUpdated(i);
          });
        } else {
          this.seek(i).catch(console.error);
          callOnUpdated(i);
        }
      };

      const next = playingState.cur + (reversed ? -1 : 1);
      const outOfRange = next >= this.sequence.length || next < 0;
      if (!outOfRange) {
        return update(next);
      }
      // 超出有效范围了

      if (mode === PlayMode.Loop || mode === PlayMode.Alternate) {
        if (mode === PlayMode.Alternate) {
          // 翻转播放方向
          reversed = !reversed;
        }

        // 下一帧应该为相应方向下的第一帧
        const next = !reversed ? 0 : this.sequence.length - 1;

        if (delay && delay > 0 && !isDelayed) {
          // 需要延迟再重复，先暂停
          this.pause();

          playingState.delayedTimeout = window.setTimeout(() => {
            play(true);
            playingState.interval = window.setInterval(
              () => play(),
              1000 / fps,
            );
            if (playingState.delayedTimeout) {
              window.clearTimeout(playingState.delayedTimeout);
              playingState.delayedTimeout = undefined;
            }
          }, delay);
          return;
        }

        update(next);
      } else {
        this.pause();
        if (onEnded) {
          window.setTimeout(() => onEnded({ i: next }), 0);
        }
      }
    };
    playingState.interval = window.setInterval(() => play(), 1000 / fps);
  }

  async playTo(
    i: number,
    options: PlayOptions = this.playingState.options,
  ): Promise<void> {
    const { cur } = this.playingState;
    if (i === cur || i < 0 || i >= this.sequence.length) {
      return;
    }
    const mode = i > cur ? PlayMode.Normal : PlayMode.Reverse;
    return this.play({
      ...options,
      mode,
      onUpdated: ({ i: j }) => {
        if (j === i) {
          this.pause();
        }
        options.onUpdated?.({ i: j });
      },
    });
  }

  private async drawCurrentFrame() {
    const { playingState } = this;
    if (playingState.cur === playingState.last) {
      return;
    }
    const image = this.sequence.getImageAt(playingState.cur);
    if (!image) {
      return;
    }

    playingState.last = playingState.cur;
    if (image instanceof window.Image) {
      return this.drawImage(image);
    }
    const waitingAt = playingState.cur;
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

      if (this.shouldClear) {
        this.clear();
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
    if (this.alpha) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
