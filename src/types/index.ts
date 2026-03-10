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
 * Definição estruturada para transportes (Console, Arquivo, Loki, Elastic, Datadog).
 */
export interface DefinicaoTransporte {
  type: 'console' | 'dailyRotateFile' | 'loki' | 'elasticsearch' | 'datadog';
  options: any;
}
