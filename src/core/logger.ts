import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import util from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

import { 
  NivelLog, 
  LoggerInstancia, 
  MetadadosLogger, 
  OpcoesLogger, 
  DefinicaoTransporte 
} from '../types/index.js';

import { 
  NIVEIS_LOG, 
  ANSI_COLORS, 
  NIVEL_LOG_PADRAO, 
  ID_INSTANCIA, 
  NOME_ECOSSISTEMA, 
  AMBIENTE_NODE, 
  PADROES_LOG,
  env
} from '../config/index.js';

import { getRequestId } from '../context/storage.js';
import { redigirDados } from './redact.js';
import { controlarTrafego } from './traffic-control.js';
import { AuditTransport } from './audit.js';

// --- Formatação ---

const injetarContexto = winston.format((info) => {
  const requestId = getRequestId();
  if (requestId) info.requestId = requestId;
  return info;
});

const formatoConsole = winston.format.combine(
  injetarContexto(),
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.splat(),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label', 'service', 'instanceId', 'environment', 'stack', 'requestId'],
  }),
  redigirDados(),
  winston.format.printf((info) => {
    const { timestamp, level, message, metadata, stack, requestId } = info;
    const label = (metadata as MetadadosLogger)?.label;
    const parteLabel = label ? ` [${label}]` : '';
    const parteRequestId = requestId ? ` [ID:${requestId}]` : '';
    
    const levelStr = String(level);
    const cor = ANSI_COLORS[levelStr] || '';
    const levelColorido = `${cor}${levelStr}${ANSI_COLORS.reset}`;
    
    const metaParaImprimir = { ...(metadata as Record<string, any>) };
    if (label) delete metaParaImprimir.label;

    const parteMeta = Object.keys(metaParaImprimir).length > 0 
      ? ` ${util.inspect(metaParaImprimir, { colors: true, depth: 3 })}` 
      : '';

    const parteServico = info.service ? ` [${info.service}]` : '';
    const parteInstancia = info.instanceId ? ` [${info.instanceId}]` : '';
    const parteStack = stack ? `\n${stack}` : '';

    return `[${timestamp}] [${levelColorido}]${parteServico}${parteInstancia}${parteRequestId}${parteLabel} - ${message}${parteMeta}${parteStack}`;
  }),
);

const formatoArquivo = winston.format.combine(
  injetarContexto(),
  winston.format.timestamp(),
  winston.format.splat(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'service', 'instanceId', 'environment', 'stack', 'requestId'],
  }),
  redigirDados(),
  winston.format.json(),
);

// --- Inicialização ---

function garantirDiretorioLogs() {
  const dirLogs = PADROES_LOG.DIR_LOGS;
  if (!fs.existsSync(dirLogs)) {
    fs.mkdirSync(dirLogs, { recursive: true, mode: PADROES_LOG.PERMISSOES_DIRETORIO });
  }
}

const obterDefinicoesTransportePadrao = (nivel: NivelLog): DefinicaoTransporte[] => {
  const transports: DefinicaoTransporte[] = [
    {
      type: 'console',
      options: {
        level: nivel,
        format: env.LOG_FORMAT === 'json' ? formatoArquivo : formatoConsole,
        handleExceptions: true,
        handleRejections: true,
      },
    },
    {
      type: 'dailyRotateFile',
      options: {
        filename: path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_APP),
        level: nivel,
        format: formatoArquivo,
        datePattern: PADROES_LOG.PADRAO_DATA,
        zippedArchive: PADROES_LOG.ARQUIVO_ZIPADO,
        maxSize: PADROES_LOG.TAMANHO_MAX_APP,
        maxFiles: PADROES_LOG.DIAS_MAX_APP,
      },
    },
    {
      type: 'dailyRotateFile',
      options: {
        filename: path.join(PADROES_LOG.DIR_LOGS, PADROES_LOG.NOME_ARQUIVO_ERRO),
        level: 'error',
        format: formatoArquivo,
        datePattern: PADROES_LOG.PADRAO_DATA,
        zippedArchive: PADROES_LOG.ARQUIVO_ZIPADO,
        maxSize: PADROES_LOG.TAMANHO_MAX_ERRO,
        maxFiles: PADROES_LOG.DIAS_MAX_ERRO,
        handleExceptions: true,
        handleRejections: true,
      },
    },
  ];

  if (env.LOKI_HOST) {
    transports.push({
      type: 'loki',
      options: {
        host: env.LOKI_HOST,
        level: nivel,
        labels: { app: NOME_ECOSSISTEMA, env: AMBIENTE_NODE },
        json: true,
        format: formatoArquivo,
      }
    });
  }

  if (env.ELASTICSEARCH_NODE) {
    transports.push({
      type: 'elasticsearch',
      options: {
        level: nivel,
        node: env.ELASTICSEARCH_NODE,
        index: `logs-${NOME_ECOSSISTEMA}-${AMBIENTE_NODE}`,
        format: formatoArquivo,
      }
    });
  }

  if (env.DATADOG_API_KEY) {
    transports.push({
      type: 'datadog',
      options: {
        level: nivel,
        apiKey: env.DATADOG_API_KEY,
        service: NOME_ECOSSISTEMA,
        ddsource: 'nodejs',
        format: formatoArquivo,
      }
    });
  }

  return transports;
};

export const criarInstanciaLogger = (opcoes: OpcoesLogger = {}): LoggerInstancia => {
  garantirDiretorioLogs();
  const nivelEfetivo = opcoes.level || NIVEL_LOG_PADRAO;

  let transportes: winston.transport[];
  if (opcoes.transports) {
    transportes = opcoes.transports;
  } else {
    const definicoes = opcoes.transportDefinitions || obterDefinicoesTransportePadrao(nivelEfetivo);
    transportes = (definicoes.map((def) => {
      try {
        if (def.type === 'console') return new winston.transports.Console(def.options);
        if (def.type === 'dailyRotateFile') return new DailyRotateFile(def.options);
        
        // Transportes opcionais com tratamento de erro caso as bibliotecas não existam
        if (def.type === 'loki') {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const LokiTransport = require('winston-loki');
          return new LokiTransport(def.options);
        }
        if (def.type === 'elasticsearch') {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { ElasticsearchTransport } = require('winston-elasticsearch');
          return new ElasticsearchTransport(def.options);
        }
        if (def.type === 'datadog') {
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const DatadogTransport = require('datadog-winston');
          return new DatadogTransport(def.options);
        }
        if (def.type === 'audit') {
          return new AuditTransport(def.options);
        }
      } catch (err) {
        console.warn(`[LOGGER] Falha ao carregar transporte '${def.type}'. Certifique-se de que a biblioteca necessária está instalada.`);
        return null;
      }
      return null;
    }).filter(t => t !== null)) as winston.transport[];
  }

  // Adiciona transporte de auditoria imutável se habilitado
  if (env.LOG_AUDIT_IMMUTABLE) {
    transportes.push(new AuditTransport({ level: 'audit' }));
  }

  return winston.createLogger({
    level: nivelEfetivo,
    levels: NIVEIS_LOG,
    format: winston.format.combine(
      redigirDados(),
      controlarTrafego(),
      opcoes.format || winston.format.errors({ stack: true })
    ),
    defaultMeta: {
      service: NOME_ECOSSISTEMA,
      instanceId: ID_INSTANCIA,
      environment: AMBIENTE_NODE,
      ...(opcoes.defaultMeta || {}),
    },
    transports: transportes,
    exitOnError: false,
  }) as LoggerInstancia;
};
