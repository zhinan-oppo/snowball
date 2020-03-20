export declare class ImageSequence {
    readonly length: number;
    private readonly urls;
    private readonly imagePromises;
    private readonly images;
    /**
     *
     * @param urls ordered image URLs
     */
    constructor(urls: string[]);
    load(): Promise<HTMLImageElement[]>;
    load(i: number): Promise<HTMLImageElement>;
    getImageAt(i: number): HTMLImageElement | Promise<HTMLImageElement>;
    getImagePathAt(i: number): string | undefined;
    private loadAt;
}
