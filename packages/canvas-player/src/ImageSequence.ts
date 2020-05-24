export class ImageSequence {
  static createFromURLs(urls: string[]) {
    return new ImageSequence(
      urls.map(() => new window.Image()),
      (img, i) =>
        new Promise((resolve, reject) => {
          if (i >= 0 && i < urls.length) {
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', (e) => reject(e));
            img.src = urls[i];
          } else {
            reject(new Error(`Out of range [0, ${urls.length}): ${i}`));
          }
        }),
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
    if (!this.imagePromises[i]) {
      const image = this.images[i];
      this.imagePromises[i] = this.imageLoader
        ? this.imageLoader(image, i).then((img) => {
            this.imagesLoaded[i] = img;
            return img;
          })
        : new Promise((resolve, reject) => {
            image.addEventListener('load', () => {
              this.imagesLoaded[i] = image;
              resolve(image);
            });
            image.addEventListener('error', reject);
          });
    }
    return this.imagePromises[i];
  }
}
