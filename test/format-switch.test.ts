import logger from '../src/index.js';

console.log(`\n--- TESTANDO FORMATO: ${process.env.LOG_FORMAT || 'padrão'} ---`);

logger.info('Esta é uma mensagem de teste de formato', { 
  ambiente: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

logger.success('Operação concluída com sucesso');
