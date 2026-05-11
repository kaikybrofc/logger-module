import Transport from 'winston-transport';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Opções do transporte OpenTelemetry.
 */
type OTelTransportOptions = {
  level?: string;
  format?: any;
};

const LOG_MESSAGE = Symbol.for('message');

/**
 * Transporte Winston compatível com OpenTelemetry Logs API.
 *
 * O transporte tenta carregar dinamicamente `@opentelemetry/api-logs` e
 * `@opentelemetry/api`. Quando disponíveis, emite log records enriquecidos
 * com dados de trace/span do contexto ativo.
 */
export class OpenTelemetryTransport extends Transport {
  private otelLogs: any | null = null;
  private otelTrace: any | null = null;
  private otelLogger: any | null = null;

  constructor(opts: OTelTransportOptions = {}) {
    super(opts);
    try {
      this.otelLogs = require('@opentelemetry/api-logs');
    } catch {
      this.otelLogs = null;
    }
    try {
      this.otelTrace = require('@opentelemetry/api');
    } catch {
      this.otelTrace = null;
    }

    if (this.otelLogs?.logs?.getLogger) {
      this.otelLogger = this.otelLogs.logs.getLogger('logger-module');
    }
  }

  /**
   * Converte `info` para um log record OTEL e envia ao logger OTEL ativo.
   */
  log(info: any, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    if (!this.otelLogger?.emit) {
      callback();
      return;
    }

    let transformed = info;
    if (this.format) {
      transformed = this.format.transform({ ...info }, this.format.options);
    }

    const activeSpan = this.otelTrace?.trace?.getActiveSpan?.();
    const spanContext = activeSpan?.spanContext?.();

    const record = {
      severityText: String(transformed.level || 'info').toUpperCase(),
      body: transformed[LOG_MESSAGE] || transformed.message || '',
      attributes: {
        ...transformed,
        level: transformed.level,
      },
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      traceFlags: spanContext?.traceFlags,
      timestamp: Date.now(),
    };

    try {
      this.otelLogger.emit(record);
    } catch (error) {
      this.emit('error', error as Error);
    }

    callback();
  }
}
