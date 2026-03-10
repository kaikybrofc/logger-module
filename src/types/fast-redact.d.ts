declare module 'fast-redact' {
  interface RedactOptions {
    paths?: string[];
    censor?: string | ((value: any, path: string[]) => any);
    remove?: boolean;
    serialize?: boolean | ((obj: any) => string);
    strict?: boolean;
  }

  function fastRedact(options?: RedactOptions): (obj: any) => any;

  export default fastRedact;
}
