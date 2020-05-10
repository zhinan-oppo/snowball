export function trimDataPrefix(str: string) {
  return str.replace(/^data-/, '');
}

export function getWindowWidth() {
  return (
    window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth
  );
}
