import winston from 'winston';
import { env } from '../config/index.js';

/**
 * Estado para controle de Sampling e Rate Limit.
 */
interface TrafficState {
  count: number;
  windowCount: number;
  lastReset: number;
  isThrottling: boolean;
}

const trafficState = new Map<string, TrafficState>();

/**
 * Formato Winston para controle de tráfego (Sampling + Rate Limit).
 */
export const controlarTrafego = winston.format((info) => {
  const { sampleKey, sampleRate, rateLimitKey, rateLimitMax, rateLimitWindow } = info as any;
  const now = Date.now();

  // 1. Lógica de Rate Limiting (Bloqueio por frequência)
  const rlKey = rateLimitKey || sampleKey; // Se não houver RL Key, tenta usar a do sample
  if (rlKey && typeof rlKey === 'string') {
    let state = trafficState.get(rlKey);
    const windowMs = Number(rateLimitWindow) || Number(env.LOG_RATE_LIMIT_WINDOW_MS);
    const max = Number(rateLimitMax) || Number(env.LOG_RATE_LIMIT_MAX);

    if (!state || (now - state.lastReset) > windowMs) {
      state = { count: 0, windowCount: 0, lastReset: now, isThrottling: false };
      trafficState.set(rlKey, state);
    }

    state.windowCount++;

    if (state.windowCount > max) {
      if (!state.isThrottling) {
        state.isThrottling = true;
        info.message = `[RATE-LIMIT:ACTIVE] ${info.message} (Bloqueando logs repetitivos nesta janela)`;
        return info;
      }
      return false; // Descarta silenciosamente enquanto estiver no limite
    }
    state.isThrottling = false;
  }

  // 2. Lógica de Sampling (1 a cada X)
  if (sampleKey && typeof sampleKey === 'string') {
    const rate = Number(sampleRate) || 10;
    let state = trafficState.get(sampleKey);

    // Se o RL acima não criou o estado, criamos aqui
    if (!state) {
      state = { count: 0, windowCount: 0, lastReset: now, isThrottling: false };
      trafficState.set(sampleKey, state);
    }

    state.count++;

    if (state.count === 1 || state.count % rate === 0) {
      info.message = `[SAMPLED:${state.count}] ${info.message}`;
      return info;
    }

    return false; // Descarta pelo sampling
  }

  // 3. Amostragem Global Randômica
  const globalRate = parseFloat(env.LOG_SAMPLING_RATE);
  if (globalRate < 1.0 && Math.random() > globalRate) {
    return false;
  }

  return info;
});
