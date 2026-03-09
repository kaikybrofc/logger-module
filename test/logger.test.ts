import logger, { criarInstanciaLogger } from '../src/logger.js';

/**
 * Script de teste para validar o funcionamento do Logger em TypeScript.
 */

console.log('--- Iniciando Teste do Logger ---');

// Testando níveis padrão
logger.info('Esta é uma mensagem de informação');
logger.warn('Esta é uma mensagem de aviso', { detalhe: 'Algo pode estar errado' });
logger.error('Esta é uma mensagem de erro', new Error('Erro de teste simulado'));
logger.debug('Esta é uma mensagem de debug (visível se LOG_LEVEL=debug)');

// Testando criação de instância personalizada
const loggerPersonalizado = criarInstanciaLogger({
  level: 'silly',
  defaultMeta: { label: 'TesteCustomizado' }
});

loggerPersonalizado.silly('Mensagem de nível "silly" do logger personalizado');
loggerPersonalizado.info('Mensagem info do logger personalizado com label de contexto');

console.log('--- Teste do Logger Finalizado ---');
