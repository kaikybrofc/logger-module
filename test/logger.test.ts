import logger, { criarInstanciaLogger, runWithContext, getRequestId } from '../src/index.js';
import winston from 'winston';
import Transport from 'winston-transport';

/**
 * Suite de Testes Abrangente para o Logger Module com Asserts
 */

class MemoryTransport extends Transport {
  public logs: any[] = [];
  log(info: any, callback: any) {
    this.logs.push(info);
    callback();
  }
}

async function executarTestes() {
  console.log('🚀 Iniciando Suite de Testes com Validações...\n');

  // --- 1. Teste de Níveis e Severidade ---
  console.log('--- [1] Validando Níveis de Severidade ---');
  const mem = new MemoryTransport();
  const testLogger = criarInstanciaLogger({ transports: [mem], level: 'silly' });
  
  const niveis = ['fatal', 'error', 'warn', 'info', 'debug', 'silly'];
  niveis.forEach(lvl => (testLogger as any)[lvl](`Teste ${lvl}`));

  if (mem.logs.length === niveis.length) {
    console.log(`✅ Sucesso: Todos os ${niveis.length} níveis foram registrados.`);
  } else {
    console.error(`❌ Falha: Esperava ${niveis.length} logs, mas recebi ${mem.logs.length}`);
    process.exit(1);
  }

  // --- 2. Teste de Filtragem ---
  console.log('\n--- [2] Validando Filtragem de Níveis ---');
  const memProd = new MemoryTransport();
  const prodLogger = criarInstanciaLogger({ transports: [memProd], level: 'info' });
  
  prodLogger.info('Info log');
  prodLogger.debug('Debug log (deve ser filtrado)');

  if (memProd.logs.length === 1 && memProd.logs[0].level === 'info') {
    console.log('✅ Sucesso: Filtro de nível funcionando corretamente.');
  } else {
    console.error('❌ Falha: Filtro de nível falhou ou log incorreto capturado.');
    process.exit(1);
  }

  // --- 3. Teste de Redação ---
  console.log('\n--- [3] Validando Redação de Dados Sensíveis ---');
  const memRedact = new MemoryTransport();
  const redactLogger = criarInstanciaLogger({ transports: [memRedact] });

  redactLogger.info('Login', { password: '123', user: 'adm', card: { number: '4444' } });
  const logRedigido = memRedact.logs[0];

  if (logRedigido.password === '[REDACTED]' && logRedigido.card === '[REDACTED]') {
    console.log('✅ Sucesso: Dados sensíveis foram redigidos.');
  } else {
    console.error('❌ Falha: Dados sensíveis vazaram!', logRedigido);
    process.exit(1);
  }

  // --- 4. Teste de Contexto (RequestId) ---
  console.log('\n--- [4] Validando RequestId ---');
  const memCtx = new MemoryTransport();
  const ctxLogger = criarInstanciaLogger({ transports: [memCtx] });

  await runWithContext(() => {
    ctxLogger.info('Log com ID');
  }, 'REQ-ID-123');

  if (memCtx.logs[0].requestId === 'REQ-ID-123') {
    console.log('✅ Sucesso: RequestId propagado corretamente.');
  } else {
    console.error('❌ Falha: RequestId não encontrado no log.', memCtx.logs[0]);
    process.exit(1);
  }

  console.log('\n✅ Todos os asserts da suíte principal passaram.');
}

executarTestes().catch(err => {
  console.error('❌ Falha crítica na execução dos testes:', err);
  process.exit(1);
});
