import logger from '../src/index.js';

/**
 * Exemplo de uso básico demonstrando todos os níveis de severidade.
 */

console.log('--- Exemplo: Níveis de Log ---');

logger.fatal('Sistema fora do ar! (Nível 0)');
logger.error('Erro ao processar arquivo.', new Error('Permissão negada'));
logger.warn('Uso de CPU elevado.');
logger.info('Servidor ouvindo na porta 3000');
logger.success('Banco de dados conectado com sucesso!');
logger.debug('Detalhes da configuração carregados.');
logger.silly('Log extremamente verboso para desenvolvimento profundo.');

// Logs com metadados
logger.info('Usuário realizou login', { 
  userId: '123', 
  ip: '192.168.0.1', 
  userAgent: 'Mozilla/5.0' 
});
