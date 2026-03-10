import logger, { LoggerInstancia } from '../src/index.js';

/**
 * Teste de validação para níveis estáticos (security, audit) e dinâmicos (via ENV).
 */

function testarNiveis() {
  console.log('--- [Teste] Validando Níveis de Segurança e Auditoria ---');

  // Testando níveis estáticos novos
  if (typeof logger.security === 'function') {
    logger.security('Teste de nível SECURITY: OK');
  } else {
    throw new Error('Nível security não encontrado no logger');
  }

  if (typeof logger.audit === 'function') {
    logger.audit('Teste de nível AUDIT: OK');
  } else {
    throw new Error('Nível audit não encontrado no logger');
  }

  console.log('\n--- [Teste] Validando Níveis Dinâmicos ---');

  // O nível 'trace' deve ser injetado via comando CLI no npm test
  const customLogger = logger as any;
  
  if (process.env.LOG_EXTRA_LEVELS?.includes('trace')) {
    if (typeof customLogger.trace === 'function') {
      customLogger.trace('Teste de nível dinâmico TRACE: OK');
      console.log('✅ Sucesso: Nível dinâmico "trace" detectado e funcional.');
    } else {
      throw new Error('Nível dinâmico "trace" configurado no ENV mas não encontrado no logger');
    }
  } else {
    console.log('ℹ️ Pulando validação de "trace" (ENV LOG_EXTRA_LEVELS não definida para este teste)');
  }

  // Validando se o método genérico .log continua funcionando para um nível registrado
  logger.log('info', 'Mensagem em nível registrado via .log()');
  
  console.log('\n✅ Teste de níveis customizados finalizado com sucesso.');
}

try {
  testarNiveis();
} catch (error: any) {
  console.error(`❌ Falha no teste de níveis: ${error.message}`);
  process.exit(1);
}
