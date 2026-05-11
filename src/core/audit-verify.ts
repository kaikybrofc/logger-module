import crypto from 'node:crypto';
import fs from 'node:fs';

/**
 * Resultado da verificação de integridade do arquivo de auditoria.
 */
export interface AuditVerifyResult {
  /** Indica se toda a cadeia está íntegra. */
  ok: boolean;
  /** Quantidade total de entradas processadas. */
  totalEntries: number;
  /** Número da primeira linha inválida/corrompida, quando houver falha. */
  firstCorruptedLine?: number;
  /** Motivo resumido da falha de integridade. */
  reason?: string;
  /** Hash esperado para a linha corrompida. */
  expectedHash?: string;
  /** Hash encontrado na linha corrompida. */
  actualHash?: string;
  /** PrevHash esperado para a linha corrompida. */
  expectedPrevHash?: string;
  /** PrevHash encontrado na linha corrompida. */
  actualPrevHash?: string;
}

const GENESIS_HASH = '0'.repeat(64);

/**
 * Faz parse seguro de uma linha JSON do arquivo de auditoria.
 */
function safeParseLine(line: string): Record<string, unknown> | null {
  try {
    return JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Recalcula o hash da entrada atual com base no hash anterior da cadeia.
 */
function calculateHash(data: Record<string, unknown>, prevHash: string): string {
  const hash = crypto.createHash('sha256');
  const rest = { ...data };
  delete (rest as any).hash;
  hash.update(JSON.stringify(rest) + prevHash);
  return hash.digest('hex');
}

/**
 * Percorre todo o arquivo de auditoria e valida a cadeia SHA-256.
 *
 * @param filePath Caminho do arquivo `auditoria.log`.
 * @returns Estrutura com status final e detalhes da primeira divergência.
 */
export function verifyAuditChain(filePath: string): AuditVerifyResult {
  if (!fs.existsSync(filePath)) {
    return {
      ok: false,
      totalEntries: 0,
      reason: 'Arquivo de auditoria não encontrado.',
    };
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) {
    return { ok: true, totalEntries: 0 };
  }

  const lines = content.split('\n').filter(Boolean);
  let prevHash = GENESIS_HASH;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const parsed = safeParseLine(lines[i]);

    if (!parsed) {
      return {
        ok: false,
        totalEntries: lines.length,
        firstCorruptedLine: lineNumber,
        reason: 'JSON inválido na linha.',
      };
    }

    const actualPrevHash = parsed.prevHash;
    if (actualPrevHash !== prevHash) {
      return {
        ok: false,
        totalEntries: lines.length,
        firstCorruptedLine: lineNumber,
        reason: 'prevHash divergente.',
        expectedPrevHash: prevHash,
        actualPrevHash: typeof actualPrevHash === 'string' ? actualPrevHash : String(actualPrevHash),
      };
    }

    const expectedHash = calculateHash(parsed, prevHash);
    const actualHash = parsed.hash;
    if (actualHash !== expectedHash) {
      return {
        ok: false,
        totalEntries: lines.length,
        firstCorruptedLine: lineNumber,
        reason: 'hash inválido.',
        expectedHash,
        actualHash: typeof actualHash === 'string' ? actualHash : String(actualHash),
      };
    }

    prevHash = expectedHash;
  }

  return { ok: true, totalEntries: lines.length };
}
