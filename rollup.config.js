import typescript from 'rollup-plugin-typescript2';
import path from 'path';

const PKG_ROOT = process.cwd();
const INPUT_FILE = path.resolve(PKG_ROOT, 'src/index.ts');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require(path.join(PKG_ROOT, 'package.json'));

const output = [
  {
    file: pkg.main,
    format: 'cjs',
  },
];
if (pkg.module) {
  output.push({
    file: pkg.module,
    format: 'es',
  });
}

export default {
  output,
  input: INPUT_FILE,
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],

  plugins: [
    typescript({
      tsconfig: path.resolve(PKG_ROOT, 'tsconfig.build.json'),
      typescript: require('typescript'),
    }),
  ],
};
