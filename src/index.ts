import { criarInstanciaLogger } from './core/logger.js';

// Exporta as funções de contexto
export { runWithContext, getRequestId } from './context/storage.js';

// Exporta os tipos
export * from './types/index.js';

// Exporta a função de criação
export { criarInstanciaLogger } from './core/logger.js';
export { createLoggerMiddleware } from './core/middleware.js';
export { LogMethod } from './core/decorators.js';
export { verifyAuditChain } from './core/audit-verify.js';
export { OpenTelemetryTransport } from './core/otel-transport.js';

// Exporta uma instância padrão pronta para uso
const logger = criarInstanciaLogger();

export default logger;
