# Logger Module TS

Um módulo de log moderno, robusto e de alta performance para aplicações Node.js utilizando TypeScript, Winston, `fast-redact` para segurança de dados e `AsyncLocalStorage` para rastreabilidade.

## ✨ Características

- **Arquitetura Modular**: Estrutura limpa e escalável separando tipos, configurações, contexto e núcleo.
- **Alta Performance**: Utiliza o motor `fast-redact` para mascaramento de dados extremamente rápido (até 6 níveis de profundidade).
- **Formatos Dinâmicos**: Alterna automaticamente entre formato **Humano (Pretty)** em desenvolvimento e **JSON Estruturado** em produção.
- **Rastreamento Automático (RequestId)**: Injeção automática de IDs de rastreamento em todos os logs de um contexto assíncrono.
- **Níveis de Segurança e Auditoria**: Suporte nativo a níveis como `security` e `audit` com destaque visual (Negrito/Ciano/Magenta).
- **Níveis Dinâmicos via ENV**: Permite que o usuário injete novos níveis de log totalmente customizados via variáveis de ambiente.
- **Redação Massiva de Dados**: Proteção automática para mais de 200 chaves sensíveis (PII, Financeiro, Saúde, Credenciais).
- **Resiliência Avançada**: Proteção nativa contra referências circulares em objetos e suporte a `BigInt`.

## 🚀 Instalação

```bash
npm install @kaikybrofc/logger-module
```

## ⚙️ Configuração

O módulo é configurado via variáveis de ambiente.

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente (`development`, `production`, `test`) | `development` |
| `LOG_LEVEL` | Nível mínimo de exibição | `debug` (dev) / `info` (prod) |
| `LOG_FORMAT` | Formato do console (`pretty` ou `json`) | Dinâmico por ambiente |
| `LOG_EXTRA_LEVELS` | Níveis extras customizados (`nome:prioridade,nome2:prioridade`) | - |
| `LOG_SENSITIVE_FILE` | Caminho para arquivo (.json, .csv, .txt) com chaves extras | - |
| `ECOSYSTEM_NAME` | Nome do serviço para identificar nos logs | `sistema` |

## 📖 Como Usar

### Níveis de Log Avançados
Além dos padrões (info, warn, error), incluímos níveis para conformidade e segurança:

```typescript
import logger from '@kaikybrofc/logger-module';

logger.security('Tentativa de brute-force detectada', { ip: '1.2.3.4' });
logger.audit('Usuário alterou senha', { userId: '123' });
logger.fatal('Falha crítica irreversível');
```

### Níveis Dinâmicos via Ambiente
Você pode criar novos níveis sem tocar no código. Se definir no seu `.env`:
`LOG_EXTRA_LEVELS="trace:15,webhook:16"`

O logger ganha automaticamente os métodos:
```typescript
logger.trace('Detalhes de baixo nível');
logger.webhook('Payload do webhook recebido', { data: '...' });
```

### Rastreabilidade com RequestId
```typescript
import logger, { runWithContext } from '@kaikybrofc/logger-module';

runWithContext(() => {
  // Todos os logs dentro deste bloco herdam o mesmo ID único
  logger.info('Iniciando processamento'); 
}, 'ID-CUSTOMIZADO-OPCIONAL');
```

### Mascaramento de Dados
```typescript
logger.info('Dados sensíveis', { password: '123', cpf: '000.000...' });
// Resultado: { "password": "[REDACTED]", "cpf": "[REDACTED]" }
```

## 📄 Licença

MIT
