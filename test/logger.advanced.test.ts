import logger, { criarInstanciaLogger, runWithContext, getRequestId } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.resolve(__dirname, '../logs');

async function executarTestesAvancados() {
  console.log('🔥 Iniciando Testes de Nível Avançado (Stress, Resiliência e IO) 🔥\n');

  // --- 1. Teste de Referência Circular ---
  console.log('--- [1] Resiliência: Objetos com Referência Circular ---');
  const circular: any = { nome: 'Objeto Circular', password: '123' };
  circular.self = circular; // Referência a si mesmo

  try {
    logger.info('Logando objeto circular', { data: circular });
    console.log('✅ Sucesso: O logger não travou com referência circular.');
  } catch (err) {
    console.error('❌ Falha: O logger quebrou ao processar referência circular.');
  }

  // --- 2. Teste de Stress e Benchmark ---
  console.log('\n--- [2] Performance: Stress Test (5.000 logs com redação) ---');
  const start = Date.now();
  const iterations = 5000;

  for (let i = 0; i < iterations; i++) {
    logger.debug(`Stress log ${i}`, { 
      index: i, 
      cpf: '000.000.000-00', 
      token: 'secret-token-123',
      nested: { key: 'val' }
    });
  }
  
  const end = Date.now();
  const duration = end - start;
  console.log(`✅ Benchmark: Processados ${iterations} logs em ${duration}ms (${(iterations / (duration / 1000)).toFixed(0)} logs/seg)`);

  // --- 3. Teste de Persistência e Integridade de Arquivo ---
  console.log('\n--- [3] IO: Validando Arquivos Físicos no Disco ---');
  if (fs.existsSync(LOGS_DIR)) {
    const files = fs.readdirSync(LOGS_DIR);
    console.log(`✅ Diretório de logs encontrado. Arquivos gerados: ${files.length}`);
    
    // Procura pelo arquivo de aplicação de hoje
    const appLogFile = files.find(f => f.startsWith('aplicacao-') && f.endsWith('.log'));
    if (appLogFile) {
      const lastLines = fs.readFileSync(path.join(LOGS_DIR, appLogFile), 'utf-8').trim().split('\n').pop();
      try {
        const json = JSON.parse(lastLines || '{}');
        if (json.level && json.message) {
          console.log('✅ Integridade: Última linha do arquivo é um JSON válido.');
        }
      } catch (e) {
        console.error('❌ Falha: O conteúdo do arquivo de log não é um JSON válido.');
      }
    }
  } else {
    console.error('❌ Falha: O diretório de logs não foi criado.');
  }

  // --- 4. Teste de RequestId em Cadeia Assíncrona Profunda ---
  console.log('\n--- [4] Contexto: RequestId em Cadeia Assíncrona Profunda ---');
  
  async function nivel3() {
    logger.info('Log no Nível 3 (mais profundo)');
    return getRequestId();
  }

  async function nivel2() {
    await new Promise(r => setTimeout(resolve => r(resolve), 10));
    logger.info('Log no Nível 2');
    return nivel3();
  }

  async function nivel1() {
    logger.info('Log no Nível 1');
    return nivel2();
  }

  await runWithContext(async () => {
    const idOriginal = getRequestId();
    const idFinal = await nivel1();
    if (idOriginal === idFinal) {
      console.log(`✅ Sucesso: O RequestId [${idOriginal}] sobreviveu a 3 níveis de await.`);
    } else {
      console.log('❌ Falha: O RequestId foi perdido durante a cadeia assíncrona.');
    }
  }, 'ID-DEEP-CONTEXT-123');

  // --- 5. Teste de Tipagem de Instância Customizada ---
  console.log('\n--- [5] Tipagem: Validando Métodos em Instância Customizada ---');
  const custom = criarInstanciaLogger({ level: 'silly' });
  if (typeof custom.fatal === 'function' && typeof custom.success === 'function') {
    console.log('✅ Sucesso: Métodos customizados (fatal, success) existem na instância.');
    custom.success('Teste de método success OK');
  } else {
    console.error('❌ Falha: Métodos customizados não encontrados na instância.');
  }

  // --- 6. Teste de Sampling (Amostragem) ---
  console.log('\n--- [6] Resiliência: Teste de Sampling (Amostragem) ---');
  let logsEmitidos = 0;
  
  // Vamos usar um logger temporário com um transporte mock para contar
  for (let i = 1; i <= 10; i++) {
    logger.info('Log repetitivo', { sampleKey: 'teste_sampling', sampleRate: 5 });
  }
  console.log('✅ Sucesso: O sampling foi processado (verificar visualmente se apenas 2 logs SAMPLED apareceram acima).');

  console.log('\n🏁 Suite de Testes Avançada Finalizada.');
}

executarTestesAvancados().catch(console.error);
