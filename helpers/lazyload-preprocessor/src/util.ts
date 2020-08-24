export function fixNumber(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}
