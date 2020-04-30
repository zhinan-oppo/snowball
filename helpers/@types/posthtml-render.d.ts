declare module 'posthtml-render' {
  import { PostHTML } from 'posthtml';
  interface Options {
    singleTags: Array<string | RegExp>;
    closingSingleTag?: 'tag' | 'slash' | 'default';
    quoteAllAttributes: boolean;
  }
  function render(
    tree: Array<string | PostHTML.Node>,
    options?: Partial<Options>,
  ): string;
  export = render;
}
