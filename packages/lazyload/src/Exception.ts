export class Exception extends Error {
  constructor(msg: string, public readonly element: HTMLElement) {
    super(msg);
  }
}
