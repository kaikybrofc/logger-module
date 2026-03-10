import winston from 'winston';
import { redact } from '../config/redaction.js';

/**
 * Formato Winston para redação de dados sensíveis utilizando fast-redact.
 * Extremamente performático por compilar as regras em tempo de inicialização.
 */
export const redigirDados = winston.format((info) => {
  // O fast-redact modifica o objeto original, então clonamos o info
  // para evitar efeitos colaterais em outros transportes.
  const infoRedigido = JSON.parse(JSON.stringify(info));
  redact(infoRedigido);
  return infoRedigido;
});
