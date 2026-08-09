# Observabilidade e Telemetria: Distributed Tracing com OpenTelemetry (OTel)

Enquanto o **Pino** resolve a necessidade de registrar _o que_ aconteceu (Logs estruturados), o **OpenTelemetry** responde à pergunta _por que demorou_ e _onde falhou_ em sistemas complexos. O OTel é o padrão ouro moderno (mantido pela Cloud Native Computing Foundation - CNCF) para gerar, coletar e exportar dados de telemetria.

---

## 1. O que é o OpenTelemetry e o Distributed Tracing?

Em uma arquitetura moderna, uma única requisição do usuário (ex: "Criar novo projeto") pode partir do front-end em Vite (SPA), fazer uma chamada HTTP para o backend Express, passar por middlewares de validação (Zod), consultar o banco de dados (Prisma) e retornar a resposta.

O **Distributed Tracing** (Rastreamento Distribuído) é a técnica de acompanhar essa requisição por toda a sua jornada.

### Os Dois Conceitos Fundamentais:

- **Trace (Rastro):** Representa a jornada completa da requisição do início ao fim.
- **Span (Trecho):** Representa uma única operação de trabalho dentro do Trace (ex: a query do banco de dados é um Span; a validação do Zod é outro Span).

## 2. Por que ir além do Pino? (Logs vs. Traces)

Se uma rota estiver demorando 2 segundos para responder, o log do Pino dirá: `{"method": "POST", "url": "/projetos", "responseTime": 2000, "status": 200}`.

Ele avisa que há um problema, mas não diz _onde_.

Com o OpenTelemetry, você abre uma interface visual e vê uma cascata de tempo exata:

1. Recebimento da requisição Express (Duração total: 2000ms)
2. ↳ Middleware de Autenticação (Duração: 10ms)
3. ↳ Validação do Zod (Duração: 5ms)
4. ↳ **Query do Prisma `INSERT INTO Projetos` (Duração: 1980ms) 🚨 <- O GARGALO**

## 3. Instalação

Para a instrumentação no Node.js, utilizamos o SDK oficial e as bibliotecas de auto-instrumentação, que injetam o código de rastreamento no Express, HTTP nativo e outras bibliotecas automaticamente, sem precisar reescrever as rotas.

```bash
# Core do OpenTelemetry e Exportador
npm install @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/exporter-trace-otlp-http

# Auto-instrumentações (Express, HTTP, etc) e Instrumentação do Prisma
npm install @opentelemetry/auto-instrumentations-node @prisma/instrumentation

```

## 4. Implementação Técnica

O aspecto mais crítico do OpenTelemetry no Node.js é que **ele deve ser inicializado antes de qualquer outra importação do sistema**. Se o Express ou o Prisma forem carregados na memória antes do OTel, ele não conseguirá instrumentá-los.

### Passo 1: Configuração Central (`src/observability/tracing.ts`)

Crie o arquivo de configuração que ditará como os rastros serão coletados e para onde serão enviados.

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/traces',
});

// Inicializa o SDK (Ele puxará o SERVICE_NAME do seu .env automaticamente)
export const otelSDK = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new PrismaInstrumentation(),
  ],
});

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK finalizado.'))
    .catch((error) =>
      console.error('Erro ao finalizar OpenTelemetry SDK', error),
    )
    .finally(() => process.exit(0));
});
```

### Passo 2: Inicialização no Ponto de Entrada (`src/server.ts`)

No seu arquivo principal, você deve importar e iniciar o SDK do OTel **na primeira linha**, antes de importar a aplicação Express.

```typescript
// 1. IMPORTAÇÃO E INICIALIZAÇÃO OBRIGATÓRIA ANTES DE TUDO
import { otelSDK } from './observability/tracing';
otelSDK.start();

// 2. Só agora importamos o app e o resto das bibliotecas
import { app } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info('Instrumentação do OpenTelemetry ativada.');
});
```

### Passo 3: Habilitar o Tracing no Prisma

No seu arquivo `schema.prisma`, você precisa dizer ao Prisma Client para habilitar a geração de dados de telemetria.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["tracing"] // Em algumas versões do Prisma 7 isso já é nativo, mas vale manter
}

datasource db {
  provider = "postgresql"
}

```

## 5. Visualização no Ambiente de Desenvolvimento (Docker)

Para ver a mágica acontecendo no ambiente local, basta adicionar uma ferramenta de visualização como o **Jaeger** (All-in-One) no seu `docker-compose.dev.yml`.

```yaml
services:
  # O seu banco de dados atual
  db:
    image: postgres:15
    # ... configurações do postgres

  # O visualizador de Traces
  jaeger:
    image: jaegertracing/all-in-one:latest
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - '16686:16686' # Interface UI do Jaeger (Acesse no navegador)
      - '4318:4318' # Porta onde o Node.js envia os traces via HTTP OTLP
```
