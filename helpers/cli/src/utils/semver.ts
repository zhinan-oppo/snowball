import { valid, gt } from 'semver';

export function getLatest(versions: string[]) {
  const [latest] = versions
    .filter((version) => valid(version))
    .sort((a, b) => (gt(a, b) ? -1 : 1));
  return latest;
}
