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

export function fileExistsIn(filename: string, dir?: string) {
  if (!dir) {
    return false;
  }
  return fileExists(resolve(dir, filename));
}

export async function readIfDirExists(filename: string, dir?: string) {
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
) {
  if (!fileExists(dir)) {
    mkdirpSync(dir);
  }
  return fileWrite(resolve(dir, filename), content);
}

export function formatRatio(ratio: number) {
  return ratio.toString().replace(/^\d*\./, 'd');
}
