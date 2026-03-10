import { criarInstanciaLogger } from '../src/index.js';

/**
 * Exemplo de Exportação para Serviços Externos.
 * 
 * O logger suporta exportação automática para Loki, Elasticsearch e Datadog
 * se configurado via variáveis de ambiente ou manualmente como mostrado aqui.
 * 
 * NOTA: Para que esses transportes funcionem, você deve instalar as bibliotecas
 * opcionais: winston-loki, winston-elasticsearch ou datadog-winston.
 */

console.log('--- Exemplo: Configuração de Exportações Externas ---\n');

// 1. Configurando via transportDefinitions manualmente (útil para customização avançada)
const loggerProd = criarInstanciaLogger({
  level: 'info',
  transportDefinitions: [
    { 
      type: 'console', 
      options: { level: 'info' } 
    },
    { 
      type: 'loki', 
      options: { 
        host: 'http://loki-prod:3100',
        labels: { app: 'minha-api', env: 'producao' }
      } 
    },
    { 
      type: 'datadog', 
      options: { 
        apiKey: 'SUA_API_KEY_AQUI',
        service: 'minha-api'
      } 
    }
  ]
});

loggerProd.info('Log enviado para Console, Loki e Datadog simultaneamente');

console.log('\n--- Configuração via Variáveis de Ambiente ---');
console.log('No seu arquivo .env, basta definir:');
console.log('LOKI_HOST=http://localhost:3100');
console.log('ELASTICSEARCH_NODE=http://localhost:9200');
console.log('DATADOG_API_KEY=sua-chave');
console.log('\nO logger detectará essas ENVs automaticamente e ativará os transportes se as bibliotecas estiverem presentes.');
