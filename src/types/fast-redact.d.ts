/**
 * Tipos auxiliares para `fast-redact` quando a dependência não expõe declarações completas.
 */
declare module 'fast-redact' {
  /**
   * Opções suportadas pela função principal de redação.
   */
  interface RedactOptions {
    paths?: string[];
    censor?: string | ((value: any, path: string[]) => any);
    remove?: boolean;
    serialize?: boolean | ((obj: any) => string);
    strict?: boolean;
  }

  /**
   * Cria função de redação para objetos de log.
   */
  function fastRedact(options?: RedactOptions): (obj: any) => any;

  export default fastRedact;
}
