/**
 * 正常向下浏览时，按 start 位置从前到后排
 */
export function sortViewportStart<T extends { viewport: { start: number } }>(
  a: T,
  b: T,
) {
  return a.viewport.start - b.viewport.start;
}

/**
 * 按  end  位置从后到前排
 */
export function sortViewportEnd<T extends { viewport: { end: number } }>(
  a: T,
  b: T,
) {
  return b.viewport.end - a.viewport.end;
}
