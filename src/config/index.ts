import 'dotenv/config';
import { cleanEnv, str } from 'envalid';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NivelLog } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definição dos níveis de severidade (Inspirado em RFC5424 + customizados)
const NIVEIS_ESTATICOS: Record<string, number> = {
  fatal: 0,
  security: 1,
  audit: 2,
  emerg: 3,
  alert: 4,
  crit: 5,
  error: 6,
  warn: 7,
  notice: 8,
  info: 9,
  success: 10,
  http: 11,
  verbose: 12,
  debug: 13,
  silly: 14,
};

// Mapeamento de cores ANSI simples
const CORES_ESTATICAS: Record<string, string> = {
  fatal: '\x1b[31m\x1b[1m',    // Red Bold
  security: '\x1b[35m\x1b[1m', // Magenta Bold
  audit: '\x1b[36m\x1b[1m',    // Cyan Bold
  emerg: '\x1b[31m',           // Red
  alert: '\x1b[33m',           // Yellow
  crit: '\x1b[31m',            // Red
  error: '\x1b[31m',           // Red
  warn: '\x1b[33m',            // Yellow
  notice: '\x1b[34m',          // Blue
  info: '\x1b[32m',            // Green
  success: '\x1b[32m',         // Green
  http: '\x1b[35m',            // Magenta
  verbose: '\x1b[36m',         // Cyan
  debug: '\x1b[34m',           // Blue
  silly: '\x1b[90m',           // Grey
  reset: '\x1b[0m'
};

// Validação das variáveis de ambiente
export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
  LOG_LEVEL: str({
    default: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
  LOG_EXTRA_LEVELS: str({ 
    default: '', 
    desc: 'Níveis extras no formato nome:prioridade,ex: trace:15' 
  }),
  ECOSYSTEM_NAME: str({ default: 'sistema' }),
  LOG_FORMAT: str({ 
    choices: ['pretty', 'json'], 
    default: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  }),
  LOG_SAMPLING_RATE: str({ 
    default: '1.0', 
    desc: 'Taxa global de amostragem (0.0 a 1.0). 1.0 significa 100% dos logs.' 
  }),
  LOG_SENSITIVE_FILE: str({ default: '' }),
  name: str({ default: undefined }),
  PM2_INSTANCE_ID: str({ default: undefined }),
  NODE_APP_INSTANCE: str({ default: undefined }),
  pm_id: str({ default: undefined }),
});

/**
 * Processa níveis extras vindos do ambiente.
 */
function obterNiveisCompletos() {
  const niveis = { ...NIVEIS_ESTATICOS };
  if (env.LOG_EXTRA_LEVELS) {
    env.LOG_EXTRA_LEVELS.split(',').forEach(par => {
      const [nome, prioridade] = par.split(':');
      if (nome && prioridade) niveis[nome.trim()] = parseInt(prioridade.trim(), 10);
    });
  }
  return niveis;
}

export const NIVEIS_LOG = obterNiveisCompletos() as Record<string, number>;
export const NOMES_NIVEIS = Object.keys(NIVEIS_LOG);
export const ANSI_COLORS: Record<string, string> = { ...CORES_ESTATICAS };


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
