import logger from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Exemplo de Redação Avançada (Dicionário Customizado).
 * 
 * Além das centenas de chaves sensíveis pré-configuradas, o logger
 * permite carregar chaves extras de um arquivo externo (.json, .csv ou .txt).
 */

console.log('--- Exemplo: Redação de Dados com Dicionário Externo ---\n');

const tempFile = path.resolve('test/custom-keys.csv');
// Criamos um arquivo temporário de chaves customizadas (ex: chaves específicas do seu negócio)
if (!fs.existsSync(path.dirname(tempFile))) fs.mkdirSync(path.dirname(tempFile), { recursive: true });
fs.writeFileSync(tempFile, 'chave_secreta_empresa,id_paciente_interno,token_legado');

console.log(`DICA: No .env, defina LOG_SENSITIVE_FILE=${tempFile}\n`);

// O logger detecta novas chaves automaticamente via ENV.
// Aqui vamos simular o comportamento de redação:

const dadosBrutos = {
  usuario: 'Admin',
  chave_secreta_empresa: 'valor-que-nao-deve-aparecer',
  id_paciente_interno: 'PAC-123456',
  info_publica: 'Pode ver'
};

logger.info('Tentativa de log com chaves sensíveis do negócio', dadosBrutos);

console.log('\n--- Observação ---');
console.log('Se o arquivo LOG_SENSITIVE_FILE estiver configurado corretamente,');
console.log('as chaves `chave_secreta_empresa` e `id_paciente_interno` aparecerão como [REDACTED].');

// Limpeza
// fs.unlinkSync(tempFile);
