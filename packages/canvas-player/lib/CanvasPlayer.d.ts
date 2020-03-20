export interface CanvasPlayerOptions {
    fitImageSize?: boolean;
    posterFrame?: false | 'first' | 'last' | number;
}
interface SeekOptions {
    draw?: boolean;
}
export declare const enum PlayMode {
    Normal = 0,
    Reverse = 1,
    Loop = 2,
    Alternate = 3
}
declare type PlayListener = (options: {
    i: number;
}) => void;
export interface PlayOptions {
    fps?: number;
    waitOnLoading?: boolean;
    mode?: PlayMode;
    onUpdated?: PlayListener;
    onEnded?: PlayListener;
}
export declare class CanvasPlayer {
    static DEBUG: boolean;
    private readonly canvas;
    private readonly ctx;
    private readonly sequence;
    private frameRequest?;
    private sizeInitialized;
    private last;
    private cur;
    private playInterval?;
    constructor(canvas: HTMLCanvasElement, imageURLs: string[], { fitImageSize, posterFrame }?: CanvasPlayerOptions);
    load(): Promise<HTMLImageElement[]>;
    seek(i: number, { draw }?: SeekOptions): Promise<void>;
    seekPercent(p: number, options: SeekOptions): Promise<void>;
    get playing(): boolean;
    pause(): void;
    play({ fps, mode, waitOnLoading, onUpdated, onEnded, }?: PlayOptions): Promise<void>;
    private drawCurrentFrame;
    private drawImage;
}
export {};
