declare module 'util.promisify' {
  import { promisify } from 'util';

  const p: typeof promisify;
  export = p;
}
