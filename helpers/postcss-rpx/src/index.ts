import { Plugin } from 'postcss';

export interface Options {}

function createPlugin(options: Options): Plugin {
  return {
    postcssPlugin: 'postcss-rpx',
    Once(root) {
      //
    },
    Declaration(decl) {
      //
    },
  };
}

export default createPlugin;
export const postcss = true;
