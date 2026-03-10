# Logger Module TS

Um módulo de log moderno, robusto e de alta performance para aplicações Node.js utilizando TypeScript, Winston, `fast-redact` para segurança de dados e `AsyncLocalStorage` para rastreabilidade.

## ✨ Características

- **Arquitetura Modular**: Estrutura limpa e escalável separando tipos, configurações, contexto e núcleo.
- **Alta Performance**: Utiliza o motor `fast-redact` para mascaramento de dados extremamente rápido (até 6 níveis de profundidade).
- **Formatos Dinâmicos**: Alterna automaticamente entre formato **Humano (Pretty)** em desenvolvimento e **JSON Estruturado** em produção.
- **Rastreamento Automático (RequestId)**: Injeção automática de IDs de rastreamento em todos os logs de um contexto assíncrono.
- **Resiliência Avançada**: Proteção nativa contra referências circulares em objetos e suporte a `BigInt`.
- **Redação Massiva de Dados**: Proteção automática para mais de 200 chaves sensíveis (PII, Financeiro, Saúde, Credenciais).
- **Dicionário Customizável**: Suporte para carregar chaves sensíveis extras via arquivo externo (JSON, CSV ou TXT).
- **Níveis RFC5424 Estendidos**: Suporte a 13 níveis de log, de `fatal` a `silly`.

## 🚀 Instalação

```bash
npm install @kaikybrofc/logger-module
```

## 📦 Publicação (npm + GitHub Packages)

O comando abaixo publica a nova versão em **dois registries**:

- npmjs (`registry.npmjs.org`)
- GitHub Packages (`npm.pkg.github.com`)

```bash
npm run release
```

Pré-requisitos no `.env`:

- `NPM_TOKEN` com permissão de publish no npmjs
- `GITHUB_TOKEN` com `repo`, `read:packages` e `write:packages`

Com isso, o pacote passa a aparecer na aba **Packages** do repositório no GitHub após a publicação.

## ⚙️ Configuração

O módulo é configurado via variáveis de ambiente.

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente (`development`, `production`, `test`) | `development` |
| `LOG_LEVEL` | Nível mínimo de exibição | `debug` (dev) / `info` (prod) |
| `LOG_FORMAT` | Formato do console (`pretty` ou `json`) | `json` (prod) / `pretty` (dev) |
| `LOG_SENSITIVE_FILE` | Caminho para arquivo (.json, .csv, .txt) com chaves extras | - |
| `ECOSYSTEM_NAME` | Nome do serviço para identificar nos logs | `sistema` |

## 📖 Como Usar

### Uso Básico
```typescript
import logger from '@kaikybrofc/logger-module';

logger.info('Servidor iniciado');
logger.success('Operação concluída');
```

### Alternância de Formatos
O logger se adapta ao ambiente onde está rodando:

- **Em Desenvolvimento (`LOG_FORMAT=pretty`)**:
  `[2026-03-10...] [info] [servico] [local] - Mensagem de teste { meta: 'dado' }`
- **Em Produção (`LOG_FORMAT=json`)**:
  `{"level":"info","message":"Mensagem","service":"servico","timestamp":"..."}`

### Rastreabilidade com RequestId
```typescript
import logger, { runWithContext } from '@kaikybrofc/logger-module';

runWithContext(() => {
  logger.info('Processando pedido'); // Inclui [ID: uuid...] automaticamente
}, 'ID-OPCIONAL');
```

### Segurança de Dados (Redação)
O logger mascara automaticamente chaves sensíveis:
```typescript
logger.info('Dados sensíveis', { password: '123', cpf: '000.000...' });
// Resultado: { "password": "[REDACTED]", "cpf": "[REDACTED]" }
```

## 📄 Licença

MIT
