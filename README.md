# Logger Module TS

Um módulo de log moderno, robusto e tipado para aplicações Node.js utilizando TypeScript, Winston e Winston Daily Rotate File.

## ✨ Características

- **Totalmente Escrito em TypeScript**: Tipagem completa para níveis de log, metadados e opções.
- **Rotação de Arquivos**: Logs automáticos por data com compressão (zip).
- **Formatos Inteligentes**: 
  - **Console**: Colorido e amigável para leitura humana.
  - **Arquivo**: Estruturado em JSON para fácil integração com ferramentas de análise (ELK, CloudWatch, etc).
- **Validação de Ambiente**: Utiliza `envalid` para garantir que as variáveis de ambiente necessárias estejam presentes e corretas.
- **Suporte a Metadados**: Adicione contexto extra aos seus logs facilmente.
- **Pronto para PM2**: Detecta automaticamente instâncias do PM2 para identificação de logs.

## 🚀 Instalação

```bash
npm install logger-module
```

## ⚙️ Configuração

O módulo utiliza as seguintes variáveis de ambiente. Você pode criar um arquivo `.env` na raiz do seu projeto para configurá-las. Veja o arquivo `.env.example` para referência.

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente da aplicação (`development`, `production`, `test`) | `development` |
| `LOG_LEVEL` | Nível mínimo de log (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`) | `debug` (dev) / `info` (prod) |
| `ECOSYSTEM_NAME` | Nome do serviço para identificar nos logs | `sistema` |

## 📖 Como Usar

### Uso Padrão

```typescript
import logger from 'logger-module';

// Mensagens simples
logger.info('Aplicação iniciada com sucesso!');
logger.warn('Uso de memória acima do esperado', { memoria: '85%' });
logger.error('Falha ao conectar no banco de dados', new Error('Timeout'));

// Com metadados extras
logger.debug('Processando pedido', { pedidoId: 123, usuario: 'joao' });
```

### Criando Instâncias Personalizadas

Você pode criar loggers específicos para diferentes partes do seu sistema:

```typescript
import { criarInstanciaLogger } from 'logger-module';

const authLogger = criarInstanciaLogger({
  level: 'info',
  defaultMeta: { label: 'Autenticação' }
});

authLogger.info('Usuário realizou login');
```

## 📂 Estrutura de Arquivos de Log

Os logs são salvos na pasta `/logs` na raiz do projeto:
- `aplicacao-YYYY-MM-DD.log`: Todos os logs conforme o `LOG_LEVEL`.
- `erro-YYYY-MM-DD.log`: Apenas logs de erro (incluindo stack trace).
- `aviso-YYYY-MM-DD.log`: Apenas logs de aviso.

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Compilar para JS
npm run build

# Executar testes
npm test
```

## 📄 Licença

MIT
