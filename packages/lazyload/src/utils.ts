export function trimDataPrefix(str: string): string {
  return str.replace(/^data-/, '');
}

export function getWindowWidth(): number {
  return (
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth
  );
}

export function isImage(element: HTMLElement): boolean {
  return element instanceof HTMLImageElement;
}

export function isVideo(element: HTMLElement): boolean {
  return element instanceof HTMLVideoElement;
}

export function getDataAttrName(attr?: string): string {
  return (attr && `data-${attr}`) || '';
}
