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
  private stream: fs.WriteStream;
  private queue: string[] = [];
  private flushingQueue = false;
  private waitingDrain = false;
  private integrityCheckEntries: number;
  private onIntegrityViolation?: (message: string, metadata: Record<string, unknown>) => void;

  constructor(opts?: any) {
    super(opts);
    this.filePath = path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_AUDITORIA);
    this.integrityCheckEntries = Number(opts?.integrityCheckEntries) || 500;
    this.onIntegrityViolation = opts?.onIntegrityViolation;
    this.lastHash = this.initializeLastHash();
    this.stream = this.createWriteStream();
    setImmediate(() => this.verifyChainOnBoot());
  }

  private createWriteStream(): fs.WriteStream {
    const stream = fs.createWriteStream(this.filePath, { flags: 'a' });
    stream.on('error', (error) => this.emit('error', error));
    return stream;
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
    } catch {
      return '0'.repeat(64);
    }
  }

  /**
   * Calcula o hash SHA-256 da entrada atual concatenada com o hash anterior.
   */
  private calculateHash(data: any, prevHash: string): string {
    const hash = crypto.createHash('sha256');
    // Removemos o campo hash se existir para não causar circularidade
    const rest = { ...data };
    delete rest.hash;
    hash.update(JSON.stringify(rest) + prevHash);
    return hash.digest('hex');
  }

  private verifyChainOnBoot(): void {
    if (!fs.existsSync(this.filePath)) return;

    try {
      const content = fs.readFileSync(this.filePath, 'utf8').trim();
      if (!content) return;

      const lines = content.split('\n').filter(Boolean);
      const total = lines.length;
      const start = Math.max(0, total - this.integrityCheckEntries);
      const tail = lines.slice(start);

      let prevHash = start > 0 ? this.getHashFromLine(lines[start - 1]) : '0'.repeat(64);
      let hasTamper = false;

      for (let i = 0; i < tail.length; i++) {
        const absoluteLine = start + i + 1;
        const parsed = this.safeParseLine(tail[i]);

        if (!parsed) {
          hasTamper = true;
          this.reportIntegrityViolation('Linha de auditoria inválida (JSON malformado).', { line: absoluteLine });
          break;
        }

        if (parsed.prevHash !== prevHash) {
          hasTamper = true;
          this.reportIntegrityViolation('Quebra na cadeia de auditoria detectada (prevHash divergente).', {
            line: absoluteLine,
            expectedPrevHash: prevHash,
            actualPrevHash: parsed.prevHash,
          });
          break;
        }

        const recalculated = this.calculateHash(parsed, prevHash);
        if (parsed.hash !== recalculated) {
          hasTamper = true;
          this.reportIntegrityViolation('Adulteração detectada na cadeia de auditoria (hash inválido).', {
            line: absoluteLine,
            expectedHash: recalculated,
            actualHash: parsed.hash,
          });
          break;
        }

        prevHash = parsed.hash;
      }

      if (!hasTamper) {
        this.lastHash = prevHash;
      }
    } catch (error) {
      this.reportIntegrityViolation('Falha ao verificar integridade do log de auditoria no boot.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private safeParseLine(line: string): any | null {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }

  private getHashFromLine(line: string): string {
    const parsed = this.safeParseLine(line);
    return parsed?.hash || '0'.repeat(64);
  }

  private reportIntegrityViolation(message: string, metadata: Record<string, unknown>): void {
    if (this.onIntegrityViolation) {
      this.onIntegrityViolation(message, {
        ...metadata,
        filePath: this.filePath,
        checkedEntries: this.integrityCheckEntries,
      });
      return;
    }
    this.emit('error', new Error(`${message} ${JSON.stringify(metadata)}`));
  }

  private enqueue(line: string): void {
    this.queue.push(line);
    this.flushQueue();
  }

  private flushQueue(): void {
    if (this.flushingQueue || this.waitingDrain) return;
    this.flushingQueue = true;

    while (this.queue.length > 0) {
      const nextLine = this.queue[0];
      const canContinue = this.stream.write(nextLine);
      this.queue.shift();

      if (!canContinue) {
        this.waitingDrain = true;
        this.stream.once('drain', () => {
          this.waitingDrain = false;
          this.flushingQueue = false;
          this.flushQueue();
        });
        return;
      }
    }

    this.flushingQueue = false;
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
    
    this.enqueue(logLine);
    callback();
  }

  close(): void {
    if (this.queue.length > 0) {
      this.flushQueue();
    }
    this.stream.end();
    super.close?.();
  }
}
