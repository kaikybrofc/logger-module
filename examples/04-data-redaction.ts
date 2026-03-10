import logger from '../src/index.js';

/**
 * Exemplo demonstrando a proteção automática contra vazamento de dados sensíveis.
 */

console.log('--- Exemplo: Segurança e Redação ---');

const payloadDoUsuario = {
  nome: 'Fulano de Tal',
  email: 'fulano@gmail.com',
  password: 'senha_secreta_123',
  financeiro: {
    cartao: '4444 5555 6666 7777',
    cvv: '123',
    agencia: '0001',
    conta: '12345-6',
    saldo: 1000000.50
  },
  metadados: {
    token_acesso: 'eyJhbGciOiJIUzI1Ni...'
  }
};

// O logger irá filtrar todas as chaves sensíveis automaticamente baseado no dicionário massivo
logger.info('Processando novos dados de usuário', payloadDoUsuario);

logger.warn('Tentativa de login com senha incorreta', {
  username: 'fulano',
  pass: 'tentativa_123' // Chaves curtas como 'pass' também são filtradas
});
