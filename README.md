# Logger Module TS

Um módulo de log moderno, robusto e de alta performance para aplicações Node.js utilizando TypeScript, Winston, `fast-redact` para segurança de dados, `AsyncLocalStorage` para rastreabilidade e sistemas avançados de controle de tráfego.

## ✨ Características

- **Arquitetura Modular**: Estrutura limpa e escalável separando tipos, configurações, contexto e núcleo.
- **Alta Performance**: Utiliza o motor `fast-redact` para mascaramento de dados extremamente rápido.
- **Traffic Control**: Sistemas integrados de **Sampling** (amostragem) e **Rate Limiting** (limite de frequência) por chave.
- **Formatos Dinâmicos**: Alterna automaticamente entre formato **Humano (Pretty)** em desenvolvimento e **JSON Estruturado** em produção.
- **Rastreamento Automático (RequestId)**: Injeção automática de IDs de rastreamento em todos os logs de um contexto assíncrono.
- **Níveis RFC5424 + Customizados**: Suporte nativo a níveis como `fatal`, `security` e `audit`, além de permitir novos níveis via ENV.
- **Redação Massiva de Dados**: Proteção automática para mais de 200 chaves sensíveis pré-configuradas.
- **Dicionário Customizável**: Carregue chaves sensíveis extras via arquivo externo (JSON, CSV ou TXT).
- **Resiliência Avançada**: Proteção contra referências circulares e suporte a `BigInt`.

## 🚀 Instalação

```bash
npm install @kaikybrofc/logger-module
```

## ⚙️ Configuração (.env)

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente (`development`, `production`, `test`) | `development` |
| `LOG_LEVEL` | Nível mínimo de exibição | `debug` (dev) / `info` (prod) |
| `LOG_FORMAT` | Formato do console (`pretty` ou `json`) | Dinâmico |
| `LOG_EXTRA_LEVELS` | Níveis extras (`nome:prioridade,ex: trace:15`) | - |
| `LOG_SAMPLING_RATE` | Taxa de amostragem global (0.0 a 1.0) | `1.0` |
| `LOG_RATE_LIMIT_MAX` | Máximo de logs por janela para uma chave | `100` |
| `LOG_SENSITIVE_FILE` | Arquivo com chaves sensíveis extras | - |
| `LOKI_HOST` | URL do host Grafana Loki | - |
| `ELASTICSEARCH_NODE` | URL do node Elasticsearch | - |
| `DATADOG_API_KEY` | API Key do Datadog | - |

## 📖 Funcionalidades em Destaque

### 📤 Exportação Opcional (Loki/Elastic/Datadog)
O logger suporta exportação automática para serviços externos se configurado via ENV e com as bibliotecas instaladas:

- **Loki**: Requer `winston-loki`
- **Elasticsearch**: Requer `winston-elasticsearch`
- **Datadog**: Requer `datadog-winston`

O carregamento é **dinâmico e opcional**, não bloqueando o funcionamento do logger caso as bibliotecas não estejam presentes.

### 🚦 Controle de Tráfego (Rate Limit & Sampling)
Evite flood de logs e reduza custos de infraestrutura:

```typescript
// Rate Limit: Permite apenas 5 logs por minuto para este erro específico
logger.error('Erro de conexão banco', { 
  rateLimitKey: 'db_error', 
  rateLimitMax: 5 
});

// Sampling: Loga apenas 1 a cada 10 ocorrências
logger.info('Processamento de rotina', { 
  sampleKey: 'routine_task', 
  sampleRate: 10 
});
```

### 🔐 Segurança e Níveis Especiais
Use níveis focados em conformidade (LGPD/ISO):

```typescript
logger.security('Tentativa de login bloqueada', { ip: '...' });
logger.audit('Permissões de usuário alteradas', { adminId: '1' });
```

### 🆔 Rastreabilidade
```typescript
import { runWithContext } from '@kaikybrofc/logger-module';

runWithContext(() => {
  logger.info('Log herda ID automaticamente');
});
```

## 📂 Estrutura de Pastas

```text
src/
├── config/      # ENV, Redação e Níveis
├── context/     # AsyncLocalStorage (RequestId)
├── core/        # Logger, Traffic Control e Redact
├── types/       # Definições TypeScript
└── index.ts     # API Pública
```

## 📄 Licença

MIT
