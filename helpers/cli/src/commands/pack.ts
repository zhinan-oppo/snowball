import createArchiver from 'archiver';
import { createWriteStream, existsSync } from 'fs';
import {
  join as joinPath,
  parse as parsePath,
  relative as relativePath,
  resolve as resolvePath,
} from 'path';
import standardVersion from 'standard-version';

import { Command, flags } from '@oclif/command';
import { IArg } from '@oclif/parser/lib/args';

import { simpleFormatDate } from '../utils/date';
import { exec } from '../utils/exec';
import { escapeRegexp } from '../utils/regexp';
import { getLatest } from '../utils/semver';

interface Config {
  packageName?: string;
  excludes: string[];
  imageRoot?: string;
  imageCacheRoot?: string;
}

export default class PackCommand extends Command {
  static description = '基于 Git 对源码及资源文件打包';

  static examples = [
    `$ snowball pack --config snowball.config.js --output dist --no-version v1.1.0`,
  ];

  static flags = {
    help: flags.help({ char: 'h' }),
    config: flags.string({
      char: 'c',
      required: false,
      description: '配置文件路径',
    }),
    output: flags.string({
      char: 'o',
      required: false,
      description: '输出文件夹，默认为命令当前执行的文件夹',
    }),
    dry: flags.boolean({
      required: false,
      description: '如果为真，则只打印需要被打包的文件而不打包',
    }),
    version: flags.boolean({
      required: false,
      default: true,
      description: '是否创建新的版本号，默认为 true',
      allowNo: true,
    }),
  };

  static args: IArg[] = [
    {
      name: 'revision',
      required: false,
      description: '生成相对该版本号的增量包；未提供则生成全量包',
    },
  ];

  private static async getFileList(
    revision: string | undefined,
    filter: (file: string) => boolean,
  ): Promise<string[]> {
    const cmd = revision
      ? `git diff --name-only ${revision}`
      : 'git -c "core.quotepath=off" ls-tree -r HEAD --name-only --full-tree';
    const files = await exec(cmd);
    return files.filter(filter);
  }

  private static async getRoot() {
    const [root] = await exec('git rev-parse --show-toplevel');
    return root;
  }

  private static async getLatestVersion() {
    const tags = await exec('git tag');
    return getLatest(tags);
  }

  private static parseConfig(file: string) {
    const path = resolvePath(file);
    return require(path);
  }

  async run(): Promise<void> {
    const {
      flags,
      args: { revision },
    } = this.parse(PackCommand);

    const root = await PackCommand.getRoot();

    if (!flags.dry && flags.version) {
      await standardVersion({ infile: resolvePath(root, 'CHANGELOG.md') });
    }
    const version = await PackCommand.getLatestVersion();

    const config: Config =
      (flags.config && PackCommand.parseConfig(flags.config)) || {};

    const excludes =
      config.excludes instanceof Array
        ? config.excludes.map((exclude) => new RegExp(exclude))
        : undefined;
    const filter = excludes
      ? (file: string) => {
          for (const exclude of excludes) {
            if (exclude.test(file)) {
              return false;
            }
          }
          return Boolean(file);
        }
      : Boolean;
    const files = await PackCommand.getFileList(revision, filter);
    const imageCacheDirs: string[] = [];
    if (config.imageRoot && config.imageCacheRoot) {
      const imageRoot = resolvePath(config.imageRoot);
      const imageCacheRoot = resolvePath(config.imageCacheRoot);
      const cacheDir = relativePath(root, imageCacheRoot);
      const regexp = new RegExp(escapeRegexp(relativePath(root, imageRoot)));
      files.forEach((file) => {
        if (regexp.test(file)) {
          const imageRelative = relativePath(imageRoot, file);
          if (existsSync(resolvePath(imageCacheRoot, imageRelative))) {
            imageCacheDirs.push(joinPath(cacheDir, imageRelative));
          }
        }
      });
    }

    if (flags.dry) {
      files.forEach((file) => {
        this.log(`[F] ${file}`);
      });
      imageCacheDirs.forEach((dir) => {
        this.log(`[D] ${dir}`);
      });
      return;
    }

    const name =
      `[${
        config.packageName || this.getPackageName(root)
      }]${simpleFormatDate()}` +
      `${version ? `-${version}` : ''}` +
      `${revision ? `-patch-${revision}` : ''}` +
      '.zip';
    const outputPath = resolvePath(flags.output || process.cwd(), name);
    const stream = createWriteStream(outputPath);
    const archiver = createArchiver('zip', { zlib: { level: 9 } });
    return new Promise((resolve, reject) => {
      let progress = { total: 0, processed: 0 };
      stream.on('close', () => {
        this.log(`🎁 ${outputPath}`);
        resolve();
      });
      archiver.on('warning', (error) => {
        this.warn(error);
      });
      archiver.on('progress', ({ entries }) => {
        progress = entries;
      });
      archiver.on('entry', (entry) => {
        this.log(`[${progress.processed + 1}] ${entry.name}`);
      });
      archiver.on('error', reject);

      archiver.pipe(stream);
      files.forEach((filepath) => {
        archiver.file(resolvePath(root, filepath), { name: filepath });
      });
      imageCacheDirs.forEach((dir) => {
        archiver.directory(resolvePath(root, dir), dir);
      });
      archiver.finalize();
    });
  }

  private getPackageName(root: string) {
    try {
      const path = resolvePath(root, 'package.json');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require(path);
      return pkg.name;
    } catch (e) {
      this.warn(e);
      return parsePath(root).name;
    }
  }
}
