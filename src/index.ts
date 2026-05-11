import { criarInstanciaLogger } from './core/logger.js';
import { createLoggerMiddleware } from './core/middleware.js';
import { LogMethod } from './core/decorators.js';

// Exporta as funções de contexto
export { runWithContext, getRequestId } from './context/storage.js';

// Exporta os tipos
export * from './types/index.js';

// Exporta a função de criação
export { criarInstanciaLogger } from './core/logger.js';
export { createLoggerMiddleware } from './core/middleware.js';
export { LogMethod } from './core/decorators.js';

// Exporta uma instância padrão pronta para uso
const logger = criarInstanciaLogger();

export default logger;
