export function polyfillCustomEvent() {
  if (typeof window.CustomEvent === 'function') {
    return;
  }

  function CustomEvent(event: string, params: Record<string, any>) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    const evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(
      event,
      params.bubbles,
      params.cancelable,
      params.detail,
    );
    return evt;
  }
  CustomEvent.prototype = window.Event.prototype as any;
  window.CustomEvent = CustomEvent as any;
}
