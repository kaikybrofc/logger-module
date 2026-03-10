import winston from 'winston';

/**
 * Níveis de log suportados pelo sistema, incluindo níveis RFC5424 e personalizados.
 */
export type NivelLog = 
  | 'fatal' 
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

/**
 * Interface estendida do Winston Logger para incluir métodos tipados dos novos níveis.
 */
export interface LoggerInstancia extends winston.Logger {
  fatal: winston.LeveledLogMethod;
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
 * Definição estruturada para transportes (Console ou Arquivo).
 */
export interface DefinicaoTransporte {
  type: 'console' | 'dailyRotateFile';
  options: any;
}
