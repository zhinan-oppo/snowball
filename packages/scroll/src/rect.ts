export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function rectFrom({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
}: DOMRectInit): Rect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    bottom: y + height,
    left: x,
    right: x + width,
  };
}
