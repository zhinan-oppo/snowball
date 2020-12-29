import {
  existsSync,
  mkdirSync,
  readFile as _readFile,
  statSync,
  writeFile as _writeFile,
} from 'fs';
import { parse, resolve } from 'path';
import promisify from 'util.promisify';

export const fileExists = existsSync;
export const fileRead = promisify(_readFile);
export const fileWrite = promisify(_writeFile);

export function mkdirpSync(dir: string): void {
  if (fileExists(dir)) {
    if (!statSync(dir).isDirectory()) {
      throw new Error(
        `Failed to make directory: ${dir} already exists as not a directory`,
      );
    }
    return;
  }
  const parsed = parse(dir);
  mkdirpSync(parsed.dir);
  mkdirSync(dir);
}

export function fileExistsIn(filename: string, dir?: string): boolean {
  if (!dir) {
    return false;
  }
  return fileExists(resolve(dir, filename));
}

export async function readIfDirExists(
  filename: string,
  dir?: string,
): Promise<Buffer | undefined> {
  if (!dir) {
    return undefined;
  }
  const path = resolve(dir, filename);
  if (!fileExists(path)) {
    return undefined;
  }
  return fileRead(path);
}

export async function writeFileUnder(
  dir: string,
  filename: string,
  content: Buffer,
): Promise<void> {
  if (!fileExists(dir)) {
    mkdirpSync(dir);
  }
  return fileWrite(resolve(dir, filename), content);
}

function fixNumber(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

/**
 * TODO: 可以指定保留小数点后的位数
 * @param ratio
 */
export function formatRatio(ratio: number): string {
  return fixNumber(ratio)
    .toString()
    .replace(/(^0*)?\./, 'd');
}
