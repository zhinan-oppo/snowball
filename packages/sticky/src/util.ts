let _stickySupported: string | undefined;

export function getSupportedKeyword(): string | undefined {
  if (typeof _stickySupported === 'string') {
    return _stickySupported;
  }

  const div = window.document.createElement('div');
  const keywords = [
    'sticky',
    '-o-sticky',
    '-webkit-sticky',
    '-moz-sticky',
    '-ms-sticky',
  ];
  for (let i = 0; i < keywords.length; i += 1) {
    div.style.position = keywords[i];
    if (div.style.position === keywords[i]) {
      _stickySupported = keywords[i];
      return _stickySupported;
    }
  }

  _stickySupported = '';
  return _stickySupported;
}
