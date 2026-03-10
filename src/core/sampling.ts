import winston from 'winston';
import { env } from '../config/index.js';

/**
 * Estado em memória para controle de amostragem por chave.
 */
const samplingState = new Map<string, { count: number; lastReset: number }>();

/**
 * Janela de tempo para resetar o contador de amostragem (ex: 1 minuto).
 */
const SAMPLING_WINDOW_MS = 60 * 1000;

/**
 * Formato Winston para amostragem de logs repetitivos.
 * 
 * Suporta:
 * 1. Amostragem Global (via LOG_SAMPLING_RATE).
 * 2. Amostragem por Chave (via metadata.sampleKey e metadata.sampleRate).
 */
export const amostrarLogs = winston.format((info) => {
  const globalRate = parseFloat(env.LOG_SAMPLING_RATE);
  // Forçamos a tipagem para evitar que o TS infira como {} ao desestruturar
  const { sampleKey, sampleRate } = info as any;

  // 1. Amostragem por Chave (Prioritária)
  if (sampleKey && typeof sampleKey === 'string') {
    const rate = Number(sampleRate) || 10; // Loga 1 a cada 10 por padrão se a chave existir
    const now = Date.now();
    let state = samplingState.get(sampleKey);

    if (!state || (now - state.lastReset) > SAMPLING_WINDOW_MS) {
      state = { count: 0, lastReset: now };
      samplingState.set(sampleKey, state);
    }

    state.count++;

    // Só permite o log se for a primeira ocorrência ou atingir o múltiplo do rate
    if (state.count === 1 || state.count % rate === 0) {
      info.message = `[SAMPLED:${state.count}] ${info.message}`;
      return info;
    }

    return false; // Descarta o log
  }

  // 2. Amostragem Global (Randômica)
  if (globalRate < 1.0) {
    if (Math.random() > globalRate) {
      return false; // Descarta aleatoriamente baseado na taxa
    }
  }

  return info;
});
