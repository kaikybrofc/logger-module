import { criarInstanciaLogger } from '../src/index.js';

/**
 * Exemplo de Auditoria Imutável (Chain-of-Trust).
 * 
 * Ativa a trilha de auditoria digital onde cada log é encadeado ao anterior via hashing SHA-256.
 * Útil para conformidade (LGPD/ISO) e detecção de adulteração em logs críticos.
 */

console.log('--- Exemplo: Auditoria Imutável (Chain-of-Trust) ---\n');

// 1. Ativando o modo auditoria (Habilitado por padrão se LOG_AUDIT_IMMUTABLE=true)
const loggerAudit = criarInstanciaLogger({
  level: 'info',
  transportDefinitions: [
    { type: 'console', options: { level: 'info' } },
    { type: 'audit', options: { level: 'audit' } } // Ativa gravação em logs/auditoria.log
  ]
});

// 2. Registrando ações críticas
// O nível 'audit' é o nível padrão monitorado pelo AuditTransport
loggerAudit.audit('Usuário admin logado', { ip: '192.168.1.100', adminId: '1' });

// 3. Registrando uma transação sensível
loggerAudit.audit('Transferência de fundos iniciada', { 
  de: 'conta-a', 
  para: 'conta-b', 
  valor: 5000 
});

console.log('\n--- Arquivo de Auditoria Gerado ---');
console.log('Verifique a pasta `logs/auditoria.log`.');
console.log('Cada linha terá os campos `prevHash` e `hash`.');
console.log('Exemplo:');
console.log('{"level":"audit","message":"...","prevHash":"000...","hash":"d9f5..."}');
console.log('\nSe qualquer linha for alterada, o `hash` da linha seguinte não baterá com o cálculo, invalidando a cadeia.');
