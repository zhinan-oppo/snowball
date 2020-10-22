type ImageLoader = (
  image: HTMLImageElement,
  i: number,
) => Promise<HTMLImageElement>;

export class ImageSequence {
  static createFromURLs(urls: string[]): ImageSequence {
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

  private readonly imagePromises: Promise<HTMLImageElement | undefined>[] = [];
  private readonly imagesLoaded: Array<HTMLImageElement | undefined>;
  private readonly imageLoader: ImageLoader;

  /**
   * @param images sorted images
   */
  constructor(
    private readonly images: HTMLImageElement[],
    loader?: ImageLoader,
  ) {
    this.length = images.length;
    this.imagesLoaded = images.map(() => undefined);

    this.imageLoader =
      loader ||
      ((image) => {
        return new Promise(
          (resolve: (value: HTMLImageElement) => void, reject) => {
            image.addEventListener('load', () => {
              resolve(image);
            });
            image.addEventListener('error', reject);
          },
        );
      });
  }

  async load(): Promise<HTMLImageElement[]>;
  async load(i: number): Promise<HTMLImageElement>;
  async load(i?: number): Promise<HTMLImageElement[] | HTMLImageElement> {
    if (i === undefined) {
      return Promise.all(this.images.map((_, i) => this.loadAt(i)));
    }
    return this.loadAt(i);
  }

  getImageAt(i: number): HTMLImageElement | Promise<HTMLImageElement> {
    return this.imagesLoaded[i] || this.loadAt(i);
  }

  private loadAt(i: number) {
    if (this.imagePromises[i]) {
      return this.imagePromises[i] as Promise<HTMLImageElement>;
    }

    const image = this.images[i];

    return (this.imagePromises[i] = new Promise(
      (resolve: (value: HTMLImageElement) => void) => {
        this.imageLoader(image, i).then((loaded) => {
          this.imagesLoaded[i] = loaded;
          resolve(loaded);
        });
      },
    ));
  }
}
