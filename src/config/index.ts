import 'dotenv/config';
import { cleanEnv, str } from 'envalid';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NivelLog } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definição dos níveis de severidade (Inspirado em RFC5424 + customizados)
export const NIVEIS_LOG: Record<NivelLog, number> = {
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

export const NOMES_NIVEIS = Object.keys(NIVEIS_LOG) as NivelLog[];

// Mapeamento de cores ANSI simples
export const ANSI_COLORS: Record<string, string> = {
  fatal: '\x1b[31m\x1b[1m',
  emerg: '\x1b[31m',
  alert: '\x1b[33m',
  crit: '\x1b[31m',
  error: '\x1b[31m',
  warn: '\x1b[33m',
  notice: '\x1b[34m',
  info: '\x1b[32m',
  success: '\x1b[32m',
  http: '\x1b[35m',
  verbose: '\x1b[36m',
  debug: '\x1b[34m',
  silly: '\x1b[90m',
  reset: '\x1b[0m'
};

// Validação das variáveis de ambiente
export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
  LOG_LEVEL: str({
    choices: NOMES_NIVEIS,
    default: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
  ECOSYSTEM_NAME: str({ default: 'sistema' }),
  LOG_SENSITIVE_FILE: str({ default: '', desc: 'Caminho para arquivo customizado com chaves sensíveis' }),
  name: str({ default: undefined }),
  PM2_INSTANCE_ID: str({ default: undefined }),
  NODE_APP_INSTANCE: str({ default: undefined }),
  pm_id: str({ default: undefined }),
});

export const NIVEL_LOG_PADRAO = env.LOG_LEVEL as NivelLog;
export const ID_INSTANCIA = env.PM2_INSTANCE_ID ?? env.NODE_APP_INSTANCE ?? env.pm_id ?? 'local';
export const NOME_ECOSSISTEMA = env.name ?? env.ECOSYSTEM_NAME ?? 'sistema';
export const AMBIENTE_NODE = env.NODE_ENV;

// Configuração do diretório de logs (sobe dois níveis em relação ao src/config/)
const RAIZ_PROJETO = path.resolve(__dirname, '..', '..');
export const CAMINHO_DIR_LOGS = path.join(RAIZ_PROJETO, 'logs');

export const PADROES_LOG = {
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
