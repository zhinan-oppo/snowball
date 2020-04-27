import { writeFile } from 'fs';
import { PostHTML } from 'posthtml';
import render from 'posthtml-render';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const promisify = require('util.promisify');

const writeFileAsync = promisify(writeFile);

export function renderContent(content?: Array<string | PostHTML.Node>) {
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
) {
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

export function writeToFile(path: string, data: Map<string, string>) {
  const items: Array<{ key: string; value: string }> = [];
  data.forEach((value, key) => {
    items.push({ key, value });
  });
  return writeFileAsync(path, JSON.stringify(items, undefined, 2));
}
