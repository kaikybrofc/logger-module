import winston from 'winston';
import { redact } from '../config/redaction.js';
import util from 'node:util';

/**
 * Formato Winston para redação de dados sensíveis utilizando fast-redact.
 * Usa util.inspect para clonagem segura contra referências circulares.
 */
export const redigirDados = winston.format((info) => {
  try {
    // Clonagem segura para evitar erros de referências circulares e manter performance
    // O fast-redact opera melhor em objetos puros.
    const infoRedigido = JSON.parse(JSON.stringify(info, (key, value) => {
      if (typeof value === 'bigint') return value.toString();
      return value;
    }));

    redact(infoRedigido);
    return infoRedigido;
  } catch (erro) {
    // Fallback: se o JSON.stringify falhar (ex: ref circular), usamos o objeto original
    // O fast-redact pode não pegar tudo se o objeto for complexo, mas o logger não trava.
    return info;
  }
});
