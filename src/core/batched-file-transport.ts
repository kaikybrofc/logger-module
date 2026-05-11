import fs from 'node:fs';
import path from 'node:path';
import Transport from 'winston-transport';

/**
 * Opções do transporte de arquivo com buffering e flush em lote.
 */
type BatchedFileTransportOptions = {
  /** Caminho do arquivo de saída. Suporta `%DATE%` para resolução diária (`YYYY-MM-DD`). */
  filename: string;
  level?: string;
  format?: any;
  /** Quantidade máxima de linhas acumuladas antes do flush imediato. */
  batchSize?: number;
  /** Intervalo máximo, em ms, para flush periódico do buffer. */
  flushIntervalMs?: number;
  /** Ativa rotação imediata ao receber sinal Unix. */
  rotateOnSignal?: boolean;
  /** Sinal Unix para forçar rotação. Padrão: `SIGUSR1`. */
  signal?: NodeJS.Signals;
};

const LOG_MESSAGE = Symbol.for('message');

/**
 * Transporte Winston com escrita em lote para reduzir I/O sob alta carga.
 *
 * Recursos:
 * - Buffer em memória com `batchSize`
 * - Flush periódico (`flushIntervalMs`) com `fsync`
 * - Rotação forçada por sinal (`SIGUSR1` por padrão)
 */
export class BatchedFileTransport extends Transport {
  private static signalHandlers = new Map<NodeJS.Signals, Set<BatchedFileTransport>>();

  private readonly filenamePattern: string;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly rotateSignal?: NodeJS.Signals;
  private buffer: string[] = [];
  private flushing = false;
  private timer?: NodeJS.Timeout;
  private stream: fs.WriteStream;
  private currentFilePath: string;

  constructor(opts: BatchedFileTransportOptions) {
    super(opts);
    this.filenamePattern = opts.filename;
    this.batchSize = Math.max(1, Number(opts.batchSize) || 100);
    this.flushIntervalMs = Math.max(50, Number(opts.flushIntervalMs) || 1000);
    this.rotateSignal = opts.rotateOnSignal === false ? undefined : (opts.signal || 'SIGUSR1');

    this.currentFilePath = this.resolveFilename();
    this.ensureDir(this.currentFilePath);
    this.stream = this.createStream(this.currentFilePath);
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.timer.unref();

    if (this.rotateSignal) {
      this.registerSignalHandler(this.rotateSignal);
    }
  }

  /**
   * Registra este transporte para reagir ao sinal configurado.
   */
  private registerSignalHandler(signal: NodeJS.Signals): void {
    if (!BatchedFileTransport.signalHandlers.has(signal)) {
      BatchedFileTransport.signalHandlers.set(signal, new Set());
      process.on(signal, () => {
        const transports = BatchedFileTransport.signalHandlers.get(signal);
        if (!transports) return;
        for (const transport of transports) {
          transport.rotateNow();
        }
      });
    }
    BatchedFileTransport.signalHandlers.get(signal)!.add(this);
  }

  /**
   * Remove este transporte da lista de ouvintes do sinal.
   */
  private unregisterSignalHandler(signal: NodeJS.Signals): void {
    const set = BatchedFileTransport.signalHandlers.get(signal);
    if (!set) return;
    set.delete(this);
  }

  /**
   * Garante que o diretório de destino exista.
   */
  private ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  /**
   * Resolve o nome final do arquivo substituindo `%DATE%` pela data atual.
   */
  private resolveFilename(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return this.filenamePattern.replace('%DATE%', `${y}-${m}-${d}`);
  }

  /**
   * Cria stream de escrita em modo append.
   */
  private createStream(filePath: string): fs.WriteStream {
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    stream.on('error', (error) => this.emit('error', error));
    return stream;
  }

  /**
   * Aplica formatação do Winston e converte a entrada para uma linha.
   */
  private formatLine(info: any): string {
    let transformed = info;
    if (this.format) {
      transformed = this.format.transform({ ...info }, this.format.options);
    }
    const line = transformed?.[LOG_MESSAGE] || JSON.stringify(transformed);
    return `${line}\n`;
  }

  /**
   * Escreve um lote e executa `fsync` para persistência em disco.
   */
  private writeBatch(payload: string): void {
    this.flushing = true;
    this.stream.write(payload, () => {
      const fd = (this.stream as any).fd;
      if (typeof fd !== 'number') {
        this.flushing = false;
        return;
      }
      fs.fsync(fd, (error) => {
        this.flushing = false;
        if (error) this.emit('error', error);
        if (this.buffer.length >= this.batchSize) {
          this.flush();
        }
      });
    });
  }

  /**
   * Envia o buffer atual para escrita, se houver dados pendentes.
   */
  private flush(): void {
    if (this.flushing || this.buffer.length === 0) return;
    const payload = this.buffer.join('');
    this.buffer.length = 0;
    this.writeBatch(payload);
  }

  /**
   * Força rotação imediata do arquivo atual.
   */
  private rotateNow(): void {
    this.flush();
    const target = this.resolveFilename();
    if (target !== this.currentFilePath) {
      this.currentFilePath = target;
      this.ensureDir(this.currentFilePath);
      this.stream.end();
      this.stream = this.createStream(this.currentFilePath);
      return;
    }

    const rotatedPath = `${this.currentFilePath}.${Date.now()}.rotated`;
    try {
      this.stream.end();
      if (fs.existsSync(this.currentFilePath)) {
        fs.renameSync(this.currentFilePath, rotatedPath);
      }
      this.stream = this.createStream(this.currentFilePath);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  /**
   * Enfileira uma linha no buffer e dispara flush quando necessário.
   */
  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));
    this.currentFilePath = this.resolveFilename();
    this.buffer.push(this.formatLine(info));
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    callback();
  }

  /**
   * Finaliza o transporte liberando timer, stream e handlers de sinal.
   */
  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.flush();
    this.stream.end();
    if (this.rotateSignal) this.unregisterSignalHandler(this.rotateSignal);
    super.close?.();
  }
}
