import winston from 'winston';

/**
 * Níveis de log suportados pelo sistema, incluindo níveis RFC5424 e personalizados.
 */
export type NivelLog = 
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
  | 'silly'
  | (string & {}); // Permite níveis dinâmicos via env

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
  [customLevel: string]: winston.LeveledLogMethod | any; // Assinatura de índice para níveis dinâmicos
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
