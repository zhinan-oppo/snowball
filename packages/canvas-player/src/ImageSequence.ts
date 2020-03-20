export class ImageSequence {
  readonly length: number;

  private readonly urls: string[];

  private readonly imagePromises: Promise<HTMLImageElement>[] = [];
  private readonly images: Array<HTMLImageElement | undefined>;

  /**
   *
   * @param urls ordered image URLs
   */
  constructor(urls: string[]) {
    this.urls = urls;
    this.length = this.urls.length;
    this.images = this.urls.map(() => undefined);
  }

  async load(): Promise<HTMLImageElement[]>;
  async load(i: number): Promise<HTMLImageElement>;
  async load(i?: number) {
    if (i === undefined) {
      return Promise.all(this.urls.map((_, i) => this.loadAt(i)));
    }
    return this.loadAt(i);
  }

  getImageAt(i: number) {
    return this.images[i] || this.loadAt(i);
  }

  getImagePathAt(i: number): string | undefined {
    return this.urls[i];
  }

  private loadAt(i: number) {
    if (i >= 0 && i < this.length) {
      if (!this.imagePromises[i]) {
        this.imagePromises[i] = new Promise((resolve, reject) => {
          const image = new window.Image();
          image.src = this.urls[i];
          image.onload = () => resolve(image);
          image.onerror = e => reject(e);
        });
      }
      return this.imagePromises[i];
    }
    return Promise.reject(
      new Error(`${i} is out of range: [0, ${this.length})`),
    );
  }
}
