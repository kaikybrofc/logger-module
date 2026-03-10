import logger, { runWithContext } from '../src/index.js';

/**
 * Exemplo de rastreamento de requisição usando AsyncLocalStorage.
 * Útil para enxergar todos os logs de um único fluxo no meio de milhares de outros.
 */

async function simularFluxoDePedido(cliente: string) {
  // Envolvemos toda a lógica da "requisição" no contexto
  return runWithContext(async () => {
    logger.info(`Recebendo pedido para o cliente: ${cliente}`);
    
    await carregarDadosDoBanco();
    
    logger.success('Pedido processado com sucesso');
  }); // O ID é gerado automaticamente se não passado
}

async function carregarDadosDoBanco() {
  // Este log herdará automaticamente o RequestId do contexto acima
  logger.info('Buscando dados no banco de dados...');
  await new Promise(r => setTimeout(r, 50));
}

// Executando simulações paralelas
console.log('--- Exemplo: Rastreamento de Contexto (RequestId) ---');
simularFluxoDePedido('Kaiky');
simularFluxoDePedido('Empresa XYZ');
