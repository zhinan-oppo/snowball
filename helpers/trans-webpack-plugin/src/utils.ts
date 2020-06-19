import { writeFile } from 'fs';
import mkdirp from 'mkdirp';
import { dirname } from 'path';
import { PostHTML } from 'posthtml';
import render from 'posthtml-render';
import promisify from 'util.promisify';

const writeFileAsync = promisify(writeFile) as (
  path: string,
  data: string,
) => Promise<void>;

export function renderContent(content?: Array<string | PostHTML.Node>): string {
  if (!content) {
    return '';
  }
  return render(content, {
    closingSingleTag: 'slash',
    quoteAllAttributes: true,
  }).replace(/\s+/g, ' ');
}

export function isDuplicatedOrFail(
  data: Map<string, string>,
  key: string,
  content: string,
): boolean {
  const old = data.get(key);
  if (!old) {
    return false;
  }
  if (old !== content) {
    throw new Error(
      `Duplicated translation key(${key}):\n\told: ${old}\n\tnew: ${content}`,
    );
  }
  return true;
}

export function writeToFile(
  path: string,
  data: Map<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = dirname(path);
    mkdirp(dir).then(() => {
      const items: Array<{ key: string; value: string }> = [];
      data.forEach((value, key) => {
        items.push({ key, value });
      });
      writeFileAsync(path, JSON.stringify(items, undefined, 2))
        .then(resolve)
        .catch(reject);
    });
  });
}

export function terseAttributeValue(attr: string, value: string): string {
  return value === attr ? '' : value;
}
