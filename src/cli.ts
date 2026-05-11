#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { verifyAuditChain } from './core/audit-verify.js';

/**
 * Exibe instruções de uso do comando.
 */
function printUsage(): void {
  console.log('Uso: logger-module verify-audit <caminho-do-arquivo>');
}

/**
 * Ponto de entrada do CLI.
 *
 * Comandos suportados:
 * - `verify-audit <arquivo>`: valida toda a cadeia de auditoria.
 *
 * Códigos de saída:
 * - `0`: sucesso (cadeia íntegra)
 * - `1`: erro de uso/comando
 * - `2`: falha de integridade
 */
function run(): void {
  const [, , command, fileArg] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (command !== 'verify-audit') {
    console.error(`Comando inválido: ${command}`);
    printUsage();
    process.exit(1);
  }

  if (!fileArg) {
    console.error('Informe o caminho do arquivo de auditoria.');
    printUsage();
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), fileArg);
  const result = verifyAuditChain(fullPath);

  if (result.ok) {
    console.log(`Cadeia íntegra. Entradas verificadas: ${result.totalEntries}. Arquivo: ${fullPath}`);
    process.exit(0);
  }

  console.error(`Falha de integridade detectada em ${fullPath}`);
  if (result.firstCorruptedLine) console.error(`Linha: ${result.firstCorruptedLine}`);
  if (result.reason) console.error(`Motivo: ${result.reason}`);
  if (result.expectedPrevHash) console.error(`PrevHash esperado: ${result.expectedPrevHash}`);
  if (result.actualPrevHash) console.error(`PrevHash encontrado: ${result.actualPrevHash}`);
  if (result.expectedHash) console.error(`Hash esperado: ${result.expectedHash}`);
  if (result.actualHash) console.error(`Hash encontrado: ${result.actualHash}`);
  process.exit(2);
}

run();
