import config from '../../rollup.config';
import path from 'path';
import fs from 'fs';

const SRC = path.resolve(__dirname, 'src');
const CMD = path.resolve(SRC, 'commands');

const entries = [
  {
    input: path.resolve(SRC, 'index.ts'),
    output: {
      file: 'lib/index.js',
      format: 'cjs',
    },
  },
];

fs.readdirSync(CMD)
  .filter((filename) => /\.ts$/.test(filename))
  .forEach((filename) => {
    entries.push({
      input: path.resolve(CMD, filename),
      output: {
        dir: 'lib/commands',
        format: 'cjs',
      },
    });
  });

export default entries.map((entry) => ({
  ...config,
  ...entry,
}));
