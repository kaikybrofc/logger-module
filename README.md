# Logger Module TS

Um módulo de log moderno, robusto e de alta performance para aplicações Node.js utilizando TypeScript, Winston, `fast-redact` para segurança de dados e `AsyncLocalStorage` para rastreabilidade.

## ✨ Características

- **Arquitetura Modular**: Estrutura limpa e escalável separando tipos, configurações, contexto e núcleo.
- **Alta Performance**: Utiliza o motor `fast-redact` para mascaramento de dados extremamente rápido (até 6 níveis de profundidade).
- **Rastreamento Automático (RequestId)**: Injeção automática de IDs de rastreamento em todos os logs de um contexto assíncrono.
- **Níveis RFC5424 Estendidos**: Suporte a 13 níveis de log, de `fatal` a `silly`.
- **Redação Massiva de Dados**: Proteção automática para mais de 200 chaves sensíveis pré-configuradas.
- **Dicionário Customizável**: Suporte para adicionar suas próprias chaves sensíveis via arquivo externo (JSON, CSV ou TXT).
- **Rotação de Arquivos**: Gerenciamento automático de arquivos de log por data com compressão.
- **Segurança de Release**: Pipeline de release em bash com rollback automático e sincronização GitHub/NPM.

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
| `ECOSYSTEM_NAME` | Nome do serviço para os logs | `sistema` |
| `LOG_SENSITIVE_FILE` | Caminho para arquivo (.json, .csv, .txt) com chaves sensíveis extras | - |

## 📖 Como Usar

### Uso Básico
```typescript
import logger from '@kaikybrofc/logger-module';

logger.info('Servidor iniciado');
logger.success('Pagamento processado', { transacaoId: 'abc' });
```

### Rastreabilidade com RequestId
```typescript
import logger, { runWithContext } from '@kaikybrofc/logger-module';

runWithContext(() => {
  logger.info('Iniciando processamento'); // [ID: uuid...] automático
}, 'ID-OPCIONAL');
```

### Configurando Chaves Sensíveis Extras
Você pode expandir a proteção do logger criando um arquivo (ex: `keys.txt`):
```text
minha_chave_secreta
token_projeto_x
```
E definindo no seu `.env`:
```env
LOG_SENSITIVE_FILE=keys.txt
```

### Redação Automática
O logger irá mascarar qualquer chave presente no dicionário (padrão ou customizado):
```typescript
logger.info('Dados do usuário', {
  usuario: {
    cpf: '123.456.789-00', // [REDACTED]
    password: '123'         // [REDACTED]
  }
});
```

## 📄 Licença

MIT
