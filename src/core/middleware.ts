import { randomUUID } from 'node:crypto';
import { runWithContext } from '../context/storage.js';
import { LoggerInstancia, MiddlewareLoggerHttp } from '../types/index.js';

type NextFunction = (err?: unknown) => void;

/**
 * Cabeçalhos aceitos para propagação de identificação de requisição.
 */
const REQUEST_ID_HEADERS = ['x-request-id', 'x-correlation-id', 'x-amzn-trace-id'] as const;

/**
 * Obtém um header de forma case-insensitive.
 */
function getHeaderCaseInsensitive(headers: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!headers) return undefined;

  const lowerName = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowerName) {
      const value = headers[key];
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) return value[0];
    }
  }

  return undefined;
}

/**
 * Resolve o requestId a partir de headers conhecidos, id do framework ou UUID.
 */
function resolveRequestId(req: any): string {
  for (const headerName of REQUEST_ID_HEADERS) {
    const fromHeader = getHeaderCaseInsensitive(req?.headers, headerName);
    if (fromHeader) return fromHeader;
  }
  if (typeof req?.id === 'string' && req.id.trim()) return req.id;
  return randomUUID();
}

/**
 * Normaliza o objeto de resposta para suportar Express (`res`) e Fastify (`reply.raw`).
 */
function getResponseLike(resOrReply: any): any {
  return resOrReply?.raw && typeof resOrReply.raw.on === 'function' ? resOrReply.raw : resOrReply;
}

/**
 * Cria middleware HTTP pronto para uso com Express/Fastify.
 *
 * - Injeta `requestId` no contexto assíncrono via `runWithContext`
 * - Propaga `x-request-id` na resposta
 * - Registra logs de entrada e saída da requisição, incluindo latência e status code
 *
 * @param logger Instância de logger da biblioteca.
 * @returns Middleware compatível com Express e hooks callback-style do Fastify.
 */
export function createLoggerMiddleware(logger: LoggerInstancia): MiddlewareLoggerHttp {
  return function loggerMiddleware(req: any, resOrReply: any, next?: NextFunction): void {
    const requestId = resolveRequestId(req);
    const responseLike = getResponseLike(resOrReply);
    const method = req?.method || 'UNKNOWN';
    const url = req?.originalUrl || req?.url || req?.raw?.url || '/';
    const startedAt = process.hrtime.bigint();

    runWithContext(() => {
      if (typeof responseLike?.setHeader === 'function' && !responseLike.headersSent) {
        responseLike.setHeader('x-request-id', requestId);
      }

      const onFinish = () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const statusCode = responseLike?.statusCode;
        logger.http('HTTP response', {
          requestId,
          method,
          url,
          statusCode,
          responseTimeMs: Number(elapsedMs.toFixed(3)),
          userAgent: req?.headers?.['user-agent'],
          ip: req?.ip || req?.raw?.ip || req?.socket?.remoteAddress,
        });
      };

      if (typeof responseLike?.once === 'function') {
        responseLike.once('finish', onFinish);
      }

      logger.http('HTTP request', {
        requestId,
        method,
        url,
        userAgent: req?.headers?.['user-agent'],
        ip: req?.ip || req?.raw?.ip || req?.socket?.remoteAddress,
      });

      if (typeof next === 'function') {
        next();
      }
    }, requestId);
  };
}
