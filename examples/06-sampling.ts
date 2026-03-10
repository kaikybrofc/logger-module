import logger from '../src/index.js';

/**
 * Exemplo de Amostragem (Sampling).
 * 
 * Útil para evitar flood de logs repetitivos (ex: erros de banco em loop).
 * O logger permite definir uma 'sampleKey'. Logs com a mesma chave serão amostrados.
 */

async function simularLoopDeErro() {
  console.log('--- Iniciando Simulação de Flood de Logs (Sampling Ativo) ---');
  console.log('DICA: O logger está configurado para logar apenas 1 a cada 5 ocorrências para esta chave.\n');

  for (let i = 1; i <= 15; i++) {
    // Passamos 'sampleKey' para identificar o grupo de logs repetitivos
    // Passamos 'sampleRate' para definir a frequência (1 a cada 5)
    logger.error('Falha de conexão com o Microserviço X', { 
      sampleKey: 'erro_conexao_x', 
      sampleRate: 5,
      tentativa: i 
    });
  }

  console.log('\n--- Simulação Finalizada ---');
  console.log('Observe que apenas as ocorrências [SAMPLED:1], [SAMPLED:5], [SAMPLED:10] e [SAMPLED:15] apareceram.');
}

simularLoopDeErro();
