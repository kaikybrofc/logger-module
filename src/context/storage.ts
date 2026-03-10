import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Armazenamento local assíncrono para manter o contexto da requisição (ex: requestId).
 */
export const loggerStorage = new AsyncLocalStorage<Map<string, string>>();

/**
 * Executa uma função dentro de um contexto com um ID de rastreamento.
 */
export function runWithContext<T>(callback: () => T, requestId?: string): T {
  const store = new Map<string, string>();
  store.set('requestId', requestId || randomUUID());
  return loggerStorage.run(store, callback);
}

/**
 * Retorna o requestId do contexto atual, se existir.
 */
export function getRequestId(): string | undefined {
  return loggerStorage.getStore()?.get('requestId');
}
