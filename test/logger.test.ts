import logger, { criarInstanciaLogger, runWithContext, getRequestId } from '../src/index.js';

/**
 * Suite de Testes Abrangente para o Logger Module
 */

async function executarTestes() {
  console.log('🚀 Iniciando Suite de Testes Completa...\n');

  // --- 1. Teste de Níveis e Severidade ---
  console.log('--- [1] Testando Todos os Níveis de Severidade ---');
  logger.fatal('FATAL: Erro catastrófico no sistema');
  logger.emerg('EMERG: Ação imediata necessária');
  logger.alert('ALERT: Condição crítica detectada');
  logger.crit('CRIT: Falha em componente essencial');
  logger.error('ERROR: Erro padrão de execução');
  logger.warn('WARN: Aviso de potencial problema');
  logger.notice('NOTICE: Evento significativo, mas normal');
  logger.info('INFO: Informação geral de fluxo');
  logger.success('SUCCESS: Operação concluída com êxito');
  logger.http('HTTP: GET /api/v1/users 200 OK');
  logger.verbose('VERBOSE: Detalhes extras do processo');
  logger.debug('DEBUG: Mensagem para depuração');
  logger.silly('SILLY: Log extremamente detalhado');

  // --- 2. Teste de Filtragem de Níveis ---
  console.log('\n--- [2] Testando Filtragem de Níveis (Instância Prod) ---');
  const prodLogger = criarInstanciaLogger({ level: 'info' });
  prodLogger.info('Esta mensagem DEVE aparecer (info)');
  prodLogger.debug('Esta mensagem NÃO deve aparecer (debug < info)');

  // --- 3. Teste de RequestId e AsyncLocalStorage (Simulação de Concorrência) ---
  console.log('\n--- [3] Testando RequestId com Concorrência ---');
  
  const tarefaSimulada = async (nome: string, idCustom: string) => {
    return runWithContext(async () => {
      logger.info(`Iniciando tarefa: ${nome}`);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      logger.info(`Finalizando tarefa: ${nome}`, { requestIdInterno: getRequestId() });
    }, idCustom);
  };

  await Promise.all([
    tarefaSimulada('Request_A', 'REQ-AAAA'),
    tarefaSimulada('Request_B', 'REQ-BBBB'),
    tarefaSimulada('Request_C', 'REQ-CCCC')
  ]);

  // --- 4. Teste de Contextos Aninhados ---
  console.log('\n--- [4] Testando Contextos Aninhados ---');
  runWithContext(() => {
    const idPai = getRequestId();
    logger.info('Log no contexto PAI', { idEsperado: idPai });

    runWithContext(() => {
      logger.warn('Log no contexto FILHO (deve ter ID diferente)');
    }, 'ID-FILHO-123');

    logger.info('Log de volta no contexto PAI (deve recuperar ID original)');
  }, 'ID-PAI-999');

  // --- 5. Teste Profundo de Redação de Dados (fast-redact) ---
  console.log('\n--- [5] Testando Redação Profunda de Dados Sensíveis ---');
  logger.info('Testando mascaramento em vários níveis e tipos', {
    auth: {
      token: 'secret-123',
      apiKey: 'key-456'
    },
    usuarios: [
      { nome: 'Alice', cpf: '111.111.111-11' },
      { nome: 'Bob', email: 'bob@exemplo.com', password: 'password123' }
    ],
    config: {
      deep: {
        nested: {
          secret: 'shhh-don-t-tell',
          address: 'Rua das Flores, 123'
        }
      }
    },
    'x-api-key': 'header-secret-value' // Testando chave com hífen
  });

  // --- 6. Teste de Erros e Stack Traces ---
  console.log('\n--- [6] Testando Log de Objetos de Erro ---');
  try {
    throw new Error('Falha de conexão simulada');
  } catch (err) {
    logger.error('Capturamos um erro esperado:', err);
  }

  // --- 7. Teste de Formatação Splat (Interpolação) ---
  console.log('\n--- [7] Testando Interpolação de Mensagens ---');
  logger.info('O usuário %s acessou o sistema %d vezes', 'Kaiky', 42, { extra: 'meta' });

  // --- 8. Teste de Chaves Customizadas de Arquivo Externo ---
  console.log('\n--- [8] Testando Chaves Customizadas (via CSV) ---');
  logger.info('Testando chaves do arquivo test/custom-keys.csv', {
    segredo_da_empresa: 'valor-confidencial',
    chave_ultra_secreta: '12345',
    dado_normal: 'livre'
  });

  console.log('\n✅ Todos os cenários de teste foram executados.');
}

executarTestes().catch(err => {
  console.error('❌ Falha crítica na execução dos testes:', err);
  process.exit(1);
});
