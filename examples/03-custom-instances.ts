import { criarInstanciaLogger } from '../src/index.js';

/**
 * Exemplo de como criar instâncias separadas com rótulos (labels) e níveis diferentes.
 */

// Logger específico para Banco de Dados (apenas avisos e erros)
const dbLogger = criarInstanciaLogger({
  level: 'warn',
  defaultMeta: { label: 'DB_CONNECTION' }
});

// Logger específico para Autenticação (bem verboso para auditoria)
const authLogger = criarInstanciaLogger({
  level: 'debug',
  defaultMeta: { label: 'AUTH_SERVICE', service: 'auth-api' }
});

console.log('--- Exemplo: Instâncias Customizadas ---');

dbLogger.info('Isso não vai aparecer no console (info < warn)');
dbLogger.warn('Tempo de resposta do banco lento detectado');

authLogger.debug('Validando token JWT do usuário');
authLogger.success('Usuário autenticado com sucesso');
