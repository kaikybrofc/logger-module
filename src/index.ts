import { criarInstanciaLogger } from './core/logger.js';

// Exporta as funções de contexto
export { runWithContext, getRequestId } from './context/storage.js';

// Exporta os tipos
export * from './types/index.js';

// Exporta a função de criação
export { criarInstanciaLogger } from './core/logger.js';

// Exporta uma instância padrão pronta para uso
const logger = criarInstanciaLogger();

export default logger;
