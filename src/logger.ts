import 'dotenv/config';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { cleanEnv, str } from 'envalid';
import util from 'node:util';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// --- Tipos e Interfaces ---

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

// --- Constantes e Configurações ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definição dos níveis de severidade (Inspirado em RFC5424 + customizados)
// Quanto menor o número, mais prioritário/severo é o log.
const NIVEIS_LOG: Record<NivelLog, number> = {
  fatal: 0,
  emerg: 1,
  alert: 2,
  crit: 3,
  error: 4,
  warn: 5,
  notice: 6,
  info: 7,
  success: 8,
  http: 9,
  verbose: 10,
  debug: 11,
  silly: 12,
};

const NOMES_NIVEIS = Object.keys(NIVEIS_LOG) as NivelLog[];

// Validação das variáveis de ambiente
const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
    desc: 'Ambiente do Node (desenvolvimento, produção ou teste)',
  }),
  LOG_LEVEL: str({
    choices: NOMES_NIVEIS,
    default: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    desc: 'Nível mínimo de log para exibição',
  }),
  ECOSYSTEM_NAME: str({ default: 'sistema', desc: 'Nome do serviço para os logs' }),
  name: str({ default: undefined, desc: 'Nome da aplicação no PM2' }),
  PM2_INSTANCE_ID: str({ default: undefined, desc: 'ID da instância no PM2' }),
  NODE_APP_INSTANCE: str({ default: undefined, desc: 'ID da instância (alternativo)' }),
  pm_id: str({ default: undefined, desc: 'ID da instância (legado)' }),
});

const NIVEL_LOG_PADRAO = env.LOG_LEVEL as NivelLog;
const ID_INSTANCIA = env.PM2_INSTANCE_ID ?? env.NODE_APP_INSTANCE ?? env.pm_id ?? 'local';
const NOME_ECOSSISTEMA = env.name ?? env.ECOSYSTEM_NAME ?? 'sistema';
const AMBIENTE_NODE = env.NODE_ENV;

// Configuração do diretório de logs (sobe um nível em relação ao src/)
const RAIZ_PROJETO = path.resolve(__dirname, '..');
const CAMINHO_DIR_LOGS = path.join(RAIZ_PROJETO, 'logs');

const PADROES_LOG = {
  DIR_LOGS: CAMINHO_DIR_LOGS,
  NOME_ARQUIVO_APP: 'aplicacao-%DATE%.log',
  NOME_ARQUIVO_ERRO: 'erro-%DATE%.log',
  NOME_ARQUIVO_AVISO: 'aviso-%DATE%.log',
  PADRAO_DATA: 'YYYY-MM-DD',
  ARQUIVO_ZIPADO: true,
  TAMANHO_MAX_APP: '20m',
  DIAS_MAX_APP: '14d',
  TAMANHO_MAX_ERRO: '10m',
  DIAS_MAX_ERRO: '30d',
  TAMANHO_MAX_AVISO: '10m',
  DIAS_MAX_AVISO: '14d',
  PERMISSOES_ARQUIVO: 0o777,
  PERMISSOES_DIRETORIO: 0o777,
};

const CORES_LOG: Record<NivelLog, string> = {
  fatal: 'red bold',
  emerg: 'red',
  alert: 'yellow',
  crit: 'red',
  error: 'red',
  warn: 'yellow',
  notice: 'blue',
  info: 'green',
  success: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey',
};

winston.addColors(CORES_LOG);

// --- Formatação ---

/**
 * Formato de saída para o console (legível para humanos e colorido).
 */
const formatoConsole = winston.format.combine(
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.colorize({ all: true }),
  winston.format.splat(),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label', 'service', 'instanceId', 'environment', 'stack'],
  }),
  winston.format.printf((info) => {
    const { timestamp, level, message, metadata, stack } = info;
    const label = (metadata as MetadadosLogger)?.label;
    const parteLabel = label ? ` [${label}]` : '';
    
    // Convertendo metadata para objeto simples para o spread
    const metaParaImprimir = { ...(metadata as Record<string, any>) };
    if (label) delete metaParaImprimir.label;

    const parteMeta = Object.keys(metaParaImprimir).length > 0 
      ? ` ${util.inspect(metaParaImprimir, { colors: true, depth: 2 })}` 
      : '';

    const parteServico = info.service ? ` [${info.service}]` : '';
    const parteInstancia = info.instanceId ? ` [${info.instanceId}]` : '';
    const parteStack = stack ? `\n${stack}` : '';

    return `[${timestamp}] [${level}]${parteServico}${parteInstancia}${parteLabel} - ${message}${parteMeta}${parteStack}`;
  }),
);

/**
 * Formato de saída para arquivos (estruturado em JSON para análise de logs).
 */
const formatoArquivo = winston.format.combine(
  winston.format.timestamp(),
  winston.format.splat(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'service', 'instanceId', 'environment', 'stack'],
  }),
  winston.format.json(),
);

// --- Transportes ---

/**
 * Retorna as definições padrão de transporte (Console + Arquivos Rotativos).
 */
const obterDefinicoesTransportePadrao = (nivel: NivelLog): DefinicaoTransporte[] => [
  {
    type: 'console',
    options: {
      level: nivel,
      format: formatoConsole,
      handleExceptions: true,
      handleRejections: true,
    },
  },
  {
    type: 'dailyRotateFile',
    options: {
      filename: path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_APP),
      datePattern: PADROES_LOG.PADRAO_DATA,
      zippedArchive: PADROES_LOG.ARQUIVO_ZIPADO,
      maxSize: PADROES_LOG.TAMANHO_MAX_APP,
      maxFiles: PADROES_LOG.DIAS_MAX_APP,
      level: nivel,
      format: formatoArquivo,
      mode: PADROES_LOG.PERMISSOES_ARQUIVO,
    },
  },
  {
    type: 'dailyRotateFile',
    options: {
      filename: path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_ERRO),
      level: 'error',
      datePattern: PADROES_LOG.PADRAO_DATA,
      zippedArchive: PADROES_LOG.ARQUIVO_ZIPADO,
      maxSize: PADROES_LOG.TAMANHO_MAX_ERRO,
      maxFiles: PADROES_LOG.DIAS_MAX_ERRO,
      format: formatoArquivo,
      mode: PADROES_LOG.PERMISSOES_ARQUIVO,
      handleExceptions: true,
      handleRejections: true,
    },
  },
  {
    type: 'dailyRotateFile',
    options: {
      filename: path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_AVISO),
      level: 'warn',
      datePattern: PADROES_LOG.PADRAO_DATA,
      zippedArchive: PADROES_LOG.ARQUIVO_ZIPADO,
      maxSize: PADROES_LOG.TAMANHO_MAX_AVISO,
      maxFiles: PADROES_LOG.DIAS_MAX_AVISO,
      format: formatoArquivo,
      mode: PADROES_LOG.PERMISSOES_ARQUIVO,
    },
  },
];

// --- Inicialização ---

/**
 * Garante que o diretório de logs existe antes de iniciar o logger.
 */
function garantirDiretorioLogs() {
  const dirLogs = PADROES_LOG.DIR_LOGS;
  const modoDir = PADROES_LOG.PERMISSOES_DIRETORIO;

  try {
    if (!fs.existsSync(dirLogs)) {
      fs.mkdirSync(dirLogs, { recursive: true, mode: modoDir });
      console.log(`[ ConfigLogger ] Diretório de logs criado: '${dirLogs}' (modo ${modoDir.toString(8)})`);
    }
  } catch (erro: any) {
    throw new Error(`Falha na configuração do Logger: Não foi possível acessar/criar o diretório '${dirLogs}'. Erro: ${erro.message}`);
  }
}

/**
 * Cria e configura uma nova instância do Winston Logger.
 */
export const criarInstanciaLogger = (opcoes: OpcoesLogger = {}): LoggerInstancia => {
  garantirDiretorioLogs();

  const nivelEfetivo = opcoes.level || NIVEL_LOG_PADRAO;

  let transportesConfigurados: winston.transport[];
  if (opcoes.transports) {
    transportesConfigurados = opcoes.transports;
  } else {
    const definicoes = opcoes.transportDefinitions || obterDefinicoesTransportePadrao(nivelEfetivo);
    transportesConfigurados = (definicoes
      .map((def) => {
        try {
          switch (def.type) {
            case 'console':
              return new winston.transports.Console(def.options);
            case 'dailyRotateFile':
              return new DailyRotateFile(def.options);
            default:
              console.warn(`[ ConfigLogger ] Tipo de transporte desconhecido: ${def.type}. Ignorando.`);
              return null;
          }
        } catch (erro: any) {
          console.error(`[ ConfigLogger ] Falha ao criar transporte ${def.type}: ${erro.message}`, erro);
          return null;
        }
      })
      .filter((t) => t !== null)) as winston.transport[];
  }

  const metadadosBase: MetadadosLogger = {
    service: NOME_ECOSSISTEMA,
    instanceId: ID_INSTANCIA,
    environment: AMBIENTE_NODE,
  };

  const metadadosFinais = { ...metadadosBase, ...(opcoes.defaultMeta || {}) };
  const formatoLogger = opcoes.format || winston.format.combine(winston.format.errors({ stack: true }));

  const instanciaLogger = winston.createLogger({
    level: nivelEfetivo,
    levels: NIVEIS_LOG,
    format: formatoLogger,
    defaultMeta: metadadosFinais,
    transports: transportesConfigurados,
    exitOnError: false,
  });

  instanciaLogger.on('error', (erro) => {
    console.error('Erro interno no Winston Logger:', erro);
  });

  console.log(`[ ConfigLogger ] Instância criada. Nível: ${nivelEfetivo}, Ambiente: ${AMBIENTE_NODE}, Instância: ${ID_INSTANCIA}, Serviço: ${NOME_ECOSSISTEMA}`);

  return instanciaLogger as LoggerInstancia;
};

// Exporta uma instância padrão pronta para uso
const logger: LoggerInstancia = criarInstanciaLogger();

export default logger;
