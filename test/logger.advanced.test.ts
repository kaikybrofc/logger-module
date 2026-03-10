import logger, { criarInstanciaLogger, runWithContext, getRequestId } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import Transport from 'winston-transport';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.resolve(__dirname, '../logs');

// Helper para capturar logs em memória para asserts
class MemoryTransport extends Transport {
  public logs: any[] = [];
  log(info: any, callback: any) {
    this.logs.push(info);
    callback();
  }
}

async function executarTestesAvancados() {
  console.log('🔥 Iniciando Testes de Nível Avançado (Stress, Resiliência e IO) 🔥\n');

  // --- 1. Teste de Referência Circular ---
  console.log('--- [1] Resiliência: Objetos com Referência Circular + Redação ---');
  const circular: any = { nome: 'Objeto Circular', password: '123' };
  circular.self = circular;

  const memTransport = new MemoryTransport();
  const testLogger = criarInstanciaLogger({
    transports: [memTransport]
  });

  try {
    testLogger.info('Logando objeto circular', { data: circular });
    const lastLog = memTransport.logs[0];
    
    if (lastLog.data && lastLog.data.password === '[REDACTED]') {
      console.log('✅ Sucesso: Objeto circular redigido corretamente.');
    } else {
      console.error('❌ Falha: Senha não foi redigida em objeto circular!', lastLog.data);
      process.exit(1);
    }
    
    if (lastLog.data.self === '[Circular]') {
      console.log('✅ Sucesso: Referência circular detectada e marcada.');
    } else {
      console.error('❌ Falha: Referência circular não foi tratada corretamente.', lastLog.data.self);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Falha: O logger quebrou ao processar referência circular.', err);
    process.exit(1);
  }

  // --- 2. Teste de Inconsistência de Sampling/Rate Limit ---
  console.log('\n--- [2] Consistência: Traffic Control em Múltiplos Transportes ---');
  const mem1 = new MemoryTransport();
  const mem2 = new MemoryTransport();
  const multiLogger = criarInstanciaLogger({
    transports: [mem1, mem2]
  });

  const sampleKey = 'teste_multi_transport';
  for (let i = 1; i <= 10; i++) {
    multiLogger.info('Log repetitivo', { sampleKey, sampleRate: 5 });
  }

  // Se o sampling rodar uma vez por evento, devemos ter o mesmo número de logs em ambos
  if (mem1.logs.length === mem2.logs.length && mem1.logs.length === 2) {
    console.log(`✅ Sucesso: Sampling consistente entre transportes (${mem1.logs.length} logs).`);
  } else {
    console.error(`❌ Falha: Inconsistência no sampling! T1: ${mem1.logs.length}, T2: ${mem2.logs.length} (Esperado: 2)`);
    process.exit(1);
  }

  // Verifica se as marcas [SAMPLED:X] são idênticas
  if (mem1.logs[0].message === mem2.logs[0].message && mem1.logs[0].message.includes('[SAMPLED:5]')) {
    console.log('✅ Sucesso: Marcas de sampling idênticas em todos os transportes.');
  } else {
    console.error('❌ Falha: Marcas de sampling divergem entre transportes ou não contêm [SAMPLED:5].', mem1.logs[0].message);
    process.exit(1);
  }

  console.log('\n🏁 Suite de Testes Avançada Finalizada.');
}

executarTestesAvancados().catch(console.error);
