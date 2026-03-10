import logger from '../src/index.js';

/**
 * Exemplo de Rate Limiting.
 * 
 * Evita flood de logs bloqueando mensagens que excedem uma frequência máxima
 * dentro de uma janela de tempo.
 */

async function simularInundacaoDeLogs() {
  console.log('--- Iniciando Simulação de Inundação (Rate Limit Ativo) ---');
  console.log('Configuração: Máximo de 5 logs por janela para esta chave.\n');

  // Simulando 20 logs disparados quase instantaneamente
  for (let i = 1; i <= 20; i++) {
    logger.warn('Alerta de sensor de temperatura', { 
      rateLimitKey: 'sensor_temp_1', 
      rateLimitMax: 5,
      leitura: 45 + i 
    });
  }

  console.log('\n--- Simulação Finalizada ---');
  console.log('Observe que apenas os primeiros 5 logs apareceram, seguidos por um aviso de [RATE-LIMIT:ACTIVE].');
  console.log('Os outros 14 logs foram descartados para proteger o sistema.');
}

simularInundacaoDeLogs();
