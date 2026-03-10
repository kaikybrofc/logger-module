import Transport from 'winston-transport';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PADROES_LOG } from '../config/index.js';

/**
 * Transporte de Auditoria Imutável (Chain-of-Trust).
 * Cada entrada de log contém um hash que depende do hash da entrada anterior.
 */
export class AuditTransport extends Transport {
  private filePath: string;
  private lastHash: string;

  constructor(opts?: any) {
    super(opts);
    this.filePath = path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_AUDITORIA);
    this.lastHash = this.initializeLastHash();
  }

  /**
   * Lê a última linha do arquivo para recuperar o hash anterior.
   * Se o arquivo não existir ou estiver vazio, inicia com um hash de 'gênese'.
   */
  private initializeLastHash(): string {
    if (!fs.existsSync(this.filePath)) {
      return '0'.repeat(64); // Hash inicial (Gênese)
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf8').trim().split('\n');
      const lastLine = content[content.length - 1];
      if (!lastLine) return '0'.repeat(64);

      const logEntry = JSON.parse(lastLine);
      return logEntry.hash || '0'.repeat(64);
    } catch (e) {
      return '0'.repeat(64);
    }
  }

  /**
   * Calcula o hash SHA-256 da entrada atual concatenada com o hash anterior.
   */
  private calculateHash(data: any, prevHash: string): string {
    const hash = crypto.createHash('sha256');
    // Removemos o campo hash se existir para não causar circularidade
    const { hash: _, ...rest } = data;
    hash.update(JSON.stringify(rest) + prevHash);
    return hash.digest('hex');
  }

  log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));

    // Pega o nível (pode ser string ou Symbol do Winston)
    const level = info.level;

    // Apenas nível 'audit' ou se for forçado
    if (level !== 'audit' && info[Symbol.for('level')] !== 'audit' && !info.forceAudit) {
      return callback();
    }

    const prevHash = this.lastHash;
    const currentHash = this.calculateHash(info, prevHash);
    
    const auditEntry = {
      ...info,
      prevHash,
      hash: currentHash,
      _audit_ver: '1.0'
    };

    // Removemos os symbols do JSON
    delete auditEntry[Symbol.for('level')];
    delete auditEntry[Symbol.for('message')];
    delete auditEntry[Symbol.for('splat')];

    this.lastHash = currentHash;

    const logLine = JSON.stringify(auditEntry) + '\n';
    
    fs.appendFileSync(this.filePath, logLine);
    callback();
  }
}
