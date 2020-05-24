export class ImageSequence {
  static createFromURLs(urls: string[]) {
    const promises: Array<Promise<HTMLImageElement> | undefined> = urls.map(
      () => undefined,
    );
    return new ImageSequence(
      urls.map(() => new window.Image()),
      (img, i) =>
        promises[i] ||
        (promises[i] = new Promise((resolve, reject) => {
          if (i >= 0 && i < urls.length) {
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', (e) => reject(e));
            img.src = urls[i];
          } else {
            reject(new Error(`Out of range [0, ${urls.length}): ${i}`));
          }
        })),
    );
  }

  readonly length: number;

  private readonly imagePromises: Promise<HTMLImageElement>[] = [];
  private readonly imagesLoaded: Array<HTMLImageElement | undefined>;

  /**
   * @param images sorted images
   */
  constructor(
    private readonly images: HTMLImageElement[],
    private readonly imageLoader?: (
      image: HTMLImageElement,
      i: number,
    ) => Promise<HTMLImageElement>,
  ) {
    this.length = images.length;
    this.imagesLoaded = images.map(() => undefined);
    this.imagePromises = images.map(
      (image, i) =>
        new Promise((resolve, reject) => {
          image.addEventListener('load', () => {
            this.imagesLoaded[i] = image;
            resolve(image);
          });
          image.addEventListener('error', reject);
        }),
    );
  }

  async load(): Promise<HTMLImageElement[]>;
  async load(i: number): Promise<HTMLImageElement>;
  async load(i?: number) {
    if (i === undefined) {
      return Promise.all(this.images.map((_, i) => this.loadAt(i)));
    }
    return this.loadAt(i);
  }

  getImageAt(i: number) {
    return this.imagesLoaded[i] || this.loadAt(i);
  }

  private loadAt(i: number) {
    const image = this.images[i];
    if (this.imageLoader) {
      this.imageLoader(image, i);
    }
    return this.imagePromises[i];
  }
}
