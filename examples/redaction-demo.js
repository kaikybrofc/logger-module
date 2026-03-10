import redactFunc from '@pinojs/redact';

// Importando via require para testar se há diferença (pinojs/redact é CJS)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pinoRedact = require('@pinojs/redact');

const redact = pinoRedact({
  paths: ['*.password', 'password'],
  censor: '[REDACTED]'
});

const obj = {
  password: '123',
  nested: {
    password: '456'
  }
};

redact(obj);
console.log('Objeto após redação:');
console.log(JSON.stringify(obj, null, 2));
