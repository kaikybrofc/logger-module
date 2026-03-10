# Logger Module TS

Um módulo de log moderno, robusto e de alta performance para aplicações Node.js utilizando TypeScript, Winston, `fast-redact` para segurança de dados e `AsyncLocalStorage` para rastreabilidade.

## ✨ Características

- **Arquitetura Modular**: Estrutura limpa e escalável separando tipos, configurações, contexto e núcleo.
- **Alta Performance**: Utiliza o motor `fast-redact` (o mesmo do Pino) para mascaramento de dados extremamente rápido.
- **Rastreamento Automático (RequestId)**: Injeção automática de IDs de rastreamento em todos os logs de um contexto assíncrono.
- **Níveis RFC5424 Estendidos**: Suporte a 13 níveis de log, de `fatal` a `silly`.
- **Redação Massiva de Dados**: Proteção automática para mais de 200 chaves sensíveis (PII, Financeiro, Saúde, Credenciais) em até 6 níveis de profundidade.
- **Rotação de Arquivos**: Gerenciamento automático de arquivos de log por data com compressão.
- **Colorização Inteligente**: Console colorido manualmente via ANSI para evitar conflitos de tipos em níveis customizados.
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
| `LOG_LEVEL` | Nível mínimo (ver tabela abaixo) | `debug` (dev) / `info` (prod) |
| `ECOSYSTEM_NAME` | Nome do serviço para os logs | `sistema` |

### Níveis de Log Disponíveis
`fatal` (0), `emerg` (1), `alert` (2), `crit` (3), `error` (4), `warn` (5), `notice` (6), `info` (7), `success` (8), `http` (9), `verbose` (10), `debug` (11), `silly` (12).

## 📖 Como Usar

### Uso Básico
```typescript
import logger from '@kaikybrofc/logger-module';

logger.info('Servidor iniciado');
logger.success('Pagamento processado', { transacaoId: 'abc' });
logger.error('Erro ao conectar', new Error('Timeout'));
```

### Rastreabilidade com RequestId
Perfeito para APIs onde você quer agrupar todos os logs de uma mesma requisição.

```typescript
import logger, { runWithContext } from '@kaikybrofc/logger-module';

runWithContext(() => {
  // O log terá um ID gerado automaticamente: [ID: uuid...]
  logger.info('Iniciando processamento');
  
  // Funções chamadas aqui herdam o mesmo ID
  fazerAlgoImportante();
}, 'ID-OPCIONAL-CUSTOMIZADO');
```

### Redação de Dados Sensíveis
O logger remove automaticamente dados sensíveis de qualquer lugar do objeto de metadados.

```typescript
logger.info('Dados do usuário', {
  usuario: {
    nome: 'João',
    cpf: '123.456.789-00', // Será mascarado
    password: '123'         // Será mascarado
  }
});
```

## 📂 Estrutura de Pastas (Arquitetura)

```text
src/
├── config/      # Variáveis de ambiente e constantes de redação
├── context/     # Gerenciamento de AsyncLocalStorage (requestId)
├── core/        # Lógica central do logger e motor fast-redact
├── types/       # Definições de tipos e interfaces TypeScript
└── index.ts     # Ponto de entrada (Public API)
```

## 📄 Licença

MIT
