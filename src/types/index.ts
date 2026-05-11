import winston from 'winston';

/**
 * Níveis de log suportados pelo sistema, incluindo níveis RFC5424 e personalizados.
 */
export type NivelLogPadrao = 
  | 'fatal' 
  | 'security'
  | 'audit'
  | 'emerg' 
  | 'alert' 
  | 'crit' 
  | 'error' 
  | 'warn' 
  | 'notice' 
  | 'info' 
  | 'success'
  | 'http' 
  | 'verbose' 
  | 'debug' 
  | 'silly';

export type NivelLog = NivelLogPadrao | string;

/**
 * Interface estendida do Winston Logger para incluir métodos tipados e dinâmicos.
 */
export interface LoggerInstancia extends winston.Logger {
  fatal: winston.LeveledLogMethod;
  security: winston.LeveledLogMethod;
  audit: winston.LeveledLogMethod;
  emerg: winston.LeveledLogMethod;
  alert: winston.LeveledLogMethod;
  crit: winston.LeveledLogMethod;
  error: winston.LeveledLogMethod;
  warn: winston.LeveledLogMethod;
  notice: winston.LeveledLogMethod;
  info: winston.LeveledLogMethod;
  success: winston.LeveledLogMethod;
  http: winston.LeveledLogMethod;
  verbose: winston.LeveledLogMethod;
  debug: winston.LeveledLogMethod;
  silly: winston.LeveledLogMethod;
  [customLevel: string]: winston.LeveledLogMethod | any;
}
/**
 * Metadados padrão para cada linha de log.
 */
export interface MetadadosLogger {
  label?: string;
  service?: string;
  instanceId?: string;
  environment?: string;
  [key: string]: unknown;
}

/**
 * Opções para criação de uma nova instância do logger.
 */
export interface OpcoesLogger {
  level?: NivelLog;
  defaultMeta?: MetadadosLogger;
  transports?: winston.transport[];
  transportDefinitions?: DefinicaoTransporte[];
  format?: winston.Logform.Format;
}

/**
 * Definição estruturada para transportes suportados pela biblioteca.
 *
 * Inclui transportes nativos (`console`, `dailyRotateFile`, `batchedFile`,
 * `audit`, `otel`) e integrações opcionais (`loki`, `elasticsearch`, `datadog`).
 */
export interface DefinicaoTransporte {
  type: 'console' | 'dailyRotateFile' | 'batchedFile' | 'loki' | 'elasticsearch' | 'datadog' | 'audit' | 'otel';
  options: any;
}

/**
 * Assinatura do middleware HTTP da biblioteca para Express/Fastify.
 */
export type MiddlewareLoggerHttp = (req: any, resOrReply: any, next?: (err?: unknown) => void) => void;

/**
 * Opções do decorador `@LogMethod`.
 */
export interface LogMethodOptions {
  /** Nível utilizado nos logs de entrada e saída. */
  level?: NivelLog;
  /** Inclui argumentos da chamada no log de entrada. */
  logArgs?: boolean;
  /** Inclui valor retornado no log de saída. */
  logResult?: boolean;
  /** Logger customizado; quando omitido usa logger padrão da biblioteca. */
  logger?: LoggerInstancia;
}
