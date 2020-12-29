import { readFile as _readFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { parse } from 'yaml';

const readFile = promisify(_readFile);

export { parse };

export async function parseFile(filePath: string): Promise<ReturnType<typeof parse>> {
  const path = resolve(filePath);
  const content = await readFile(path);
  return parse(content.toString());
}
