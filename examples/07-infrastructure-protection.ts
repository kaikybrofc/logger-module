import logger from '../src/index.js';

/**
 * Cenário Avançado: Proteção de Infraestrutura
 * 
 * Este exemplo mostra como usar o Rate Limiting para evitar que uma falha
 * em cascata (como banco fora do ar) gere milhões de logs e derrube o disco
 * ou sature o sistema de logs (Datadog/CloudWatch).
 */

console.log('--- Cenário: Proteção contra Falha em Cascata ---\n');

async function tentarOperacaoCritica(tentativa: number) {
  // Simulando um erro que acontece em alta frequência
  const erroBanco = new Error('ECONNREFUSED: Banco de dados não responde');

  // Usamos uma chave única para este erro + um limite baixo
  // Apenas os primeiros 3 logs aparecerão. O resto será bloqueado até o reset da janela.
  logger.error('Falha na operação de banco', {
    err: erroBanco,
    rateLimitKey: 'erro_banco_dados_global',
    rateLimitMax: 3,
    rateLimitWindow: 10000, // Janela curta de 10s para o exemplo
    tentativa
  });
}

async function stressTest() {
  for (let i = 1; i <= 10; i++) {
    await tentarOperacaoCritica(i);
    // Sem delay para simular flood
  }
  
  console.log('\n✅ Simulação concluída.');
  console.log('Verifique que apenas 3 mensagens de erro e 1 de [RATE-LIMIT:ACTIVE] foram emitidas.');
}

stressTest();
