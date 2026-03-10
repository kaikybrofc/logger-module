import logger, { criarInstanciaLogger } from '../src/logger.js';

/**
 * Script de teste para validar o funcionamento do Logger em TypeScript com os novos níveis.
 */

console.log('--- Iniciando Teste do Logger com Novos Níveis ---');

// Testando níveis de alta severidade (RFC5424)
logger.fatal('MENSAGEM FATAL: O sistema parou!');
logger.emerg('MENSAGEM DE EMERGÊNCIA: Ação imediata necessária');
logger.alert('MENSAGEM DE ALERTA: Condição crítica');
logger.crit('MENSAGEM CRÍTICA: Falha no componente');
logger.error('Esta é uma mensagem de erro padrão');

// Testando níveis informativos e novos
logger.warn('Esta é uma mensagem de aviso');
logger.notice('Esta é uma mensagem de notificação (notice)');
logger.info('Esta é uma mensagem de informação');
logger.success('Esta é uma mensagem de SUCESSO!');

// Testando níveis de debug
logger.http('Log de requisição HTTP');
logger.verbose('Log detalhado (verbose)');
logger.debug('Log de depuração (debug)');
logger.silly('Log extremamente detalhado (silly)');

// Testando criação de instância personalizada com novo nível
const loggerPersonalizado = criarInstanciaLogger({
  level: 'success',
  defaultMeta: { label: 'TesteNovosNiveis' }
});

console.log('\n--- Testando Logger Personalizado (Nível: success) ---');
loggerPersonalizado.fatal('Fatal visível no personalizado');
loggerPersonalizado.success('Sucesso visível no personalizado');
loggerPersonalizado.info('Info visível no personalizado (nível 7 < success 8)');
loggerPersonalizado.debug('Debug NÃO deve ser visível no personalizado (debug 11 > success 8)');

console.log('--- Teste do Logger Finalizado ---');
