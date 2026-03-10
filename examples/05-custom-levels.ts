import logger from '../src/index.js';

/**
 * Exemplo demonstrando o uso de níveis de alta prioridade (security, audit)
 * e como utilizar níveis dinâmicos configurados via variáveis de ambiente.
 * 
 * Para testar níveis dinâmicos, execute:
 * LOG_EXTRA_LEVELS="trace:15,webhook:16" ./node_modules/.bin/tsx examples/05-custom-levels.ts
 */

console.log('--- Exemplo: Níveis de Segurança e Auditoria ---');

// Níveis estáticos de alta prioridade que adicionamos para conformidade (LGPD/ISO)
logger.security('Tentativa de acesso não autorizada detectada!', { ip: '10.0.0.50', user: 'admin' });
logger.audit('Usuário alterou permissões do grupo "financeiro"', { adminId: '99', targetId: '123' });
logger.fatal('Sistema entrando em modo de pânico: Banco de dados corrompido!');

console.log('\n--- Exemplo: Níveis Dinâmicos (Via LOG_EXTRA_LEVELS) ---');

/**
 * Você pode injetar níveis dinâmicos via ENV.
 * O TypeScript aceita a chamada dinâmica se o nível existir na configuração.
 */

// Simulando checagem de nível dinâmico (ex: trace)
if (typeof (logger as any).trace === 'function') {
  (logger as any).trace('Este é um nível dinâmico injetado via ambiente!');
} else {
  console.log('DICA: Execute com LOG_EXTRA_LEVELS="trace:15" para ver níveis dinâmicos em ação.');
}

// O método genérico .log() sempre funciona para qualquer nível, mesmo sem configuração prévia
logger.log('custom_level', 'Esta mensagem usa um nível totalmente arbitrário via .log()');
