import winston from 'winston';
import { SENSITIVE_KEYS } from '../config/redaction.js';

const SENSITIVE_SET = new Set(SENSITIVE_KEYS);

/**
 * Formato Winston para redação de dados sensíveis.
 * Realiza uma cópia profunda segura contra referências circulares e
 * aplica redação em todas as chaves sensíveis encontradas.
 */
export const redigirDados = winston.format((info) => {
  const seen = new WeakMap();
  // console.log('[DEBUG:INFO]', util.inspect(info, { depth: 3 }));

  const processarERedigir = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    if (obj instanceof RegExp) return obj.toString();
    if (seen.has(obj)) return '[Circular]';

    if (obj instanceof Error) {
      const errorObj: any = { name: obj.name, message: obj.message, stack: obj.stack };
      seen.set(obj, errorObj);

      // Error.cause pode ser não-enumerável (ES2022), então tratamos explicitamente.
      if ('cause' in obj && (obj as any).cause !== undefined) {
        errorObj.cause = processarERedigir((obj as any).cause);
      }

      // Copia outras propriedades que o Erro possa ter (ex: code, status, etc)
      for (const key in obj) {
        if (
          Object.prototype.hasOwnProperty.call(obj, key) &&
          key !== 'name' &&
          key !== 'message' &&
          key !== 'stack' &&
          key !== 'cause'
        ) {
          errorObj[key] = processarERedigir((obj as any)[key]);
        }
      }
      return errorObj;
    }
    
    const isArray = Array.isArray(obj);
    const result = isArray ? [] : {};
    seen.set(obj, result);

    // Processa propriedades normais
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (SENSITIVE_SET.has(key)) {
          (result as any)[key] = '[REDACTED]';
        } else {
          (result as any)[key] = processarERedigir(obj[key]);
        }
      }
    }

    // Copia Symbols (Winston internals)
    const symbols = Object.getOwnPropertySymbols(obj);
    for (const sym of symbols) {
      (result as any)[sym] = (obj as any)[sym];
    }

    return result;
  };

  try {
    return processarERedigir(info);
  } catch {
    return info;
  }
});
