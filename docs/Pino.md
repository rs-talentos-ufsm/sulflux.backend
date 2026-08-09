# Observabilidade e Auditoria: Logs Estruturados com Pino

A observabilidade é um pilar crítico em arquiteturas de backend escaláveis. Enquanto o desenvolvimento local permite a leitura manual do terminal, ambientes de produção exigem que as métricas e erros sejam legíveis por máquinas. É aqui que entram os **Logs Estruturados**.

Abaixo está a documentação completa para integrar essa prática ao projeto utilizando o ecossistema do **Pino**.

---

## 1. O que são Logs Estruturados?

Logs tradicionais (como os gerados por `console.log`) emitem linhas de texto puro. Em um servidor recebendo milhares de requisições por minuto, procurar a causa de um erro em um mar de texto é ineficiente e propenso a falhas.

Os **Logs Estruturados** resolvem esse problema registrando cada evento no formato **JSON**.

### Principais Benefícios:

- **Indexação e Busca:** Ferramentas modernas de monitoramento (Kibana, Datadog, Grafana Loki, AWS CloudWatch) conseguem ler as propriedades do JSON nativamente. Isso permite realizar consultas complexas, como: _"Mostre todos os erros (level: error) do usuário X (userId: 123) na rota Y nos últimos 10 minutos"_.
- **Contexto Rico:** Um log em JSON carrega não apenas a mensagem ("Usuário criado"), mas metadados exatos (ID da requisição, tempo de resposta, IP, status HTTP).
- **Automação:** É possível configurar alertas automáticos baseados em chaves específicas do JSON (ex: disparar um alarme se a chave `statusCode` for `500` mais de 10 vezes em um minuto).

## 2. Por que escolher o Pino?

O ecossistema Node.js possui ferramentas consagradas como Winston ou Morgan. No entanto, buscando a tecnologia mais atual e de maior performance, o **Pino** é a escolha definitiva.

- **Performance Extrema:** O Pino foi projetado desde o primeiro dia para ter o menor _overhead_ possível. Ele é substancialmente mais rápido que o Winston, garantindo que a geração de logs não atrase o processamento das requisições do Express.
- **JSON Nativo:** Ele emite logs estruturados por padrão, sem a necessidade de configurações complexas de _transports_ apenas para formatar os dados.
- **Integração Perfeita:** Com a biblioteca auxiliar `pino-http`, a integração com frameworks web é feita em uma única linha, substituindo middlewares antigos de log de requisições.

## 3. Instalação

A instalação contempla o motor principal, o integrador para chamadas HTTP e as ferramentas de formatação visual exclusivas para o ambiente de desenvolvimento.

```bash
# Dependências de produção
npm install pino pino-http

# Dependências de desenvolvimento (tipagens e formatador visual)
npm install -D pino-pretty @types/pino @types/pino-http

```

## 4. Implementação Técnica

Para manter a arquitetura limpa, a configuração deve ser isolada em um utilitário central, podendo ser exportada e utilizada em qualquer parte da aplicação, mesmo fora do escopo do roteamento HTTP.

### Passo 1: Configuração Central (`src/utils/logger.ts`)

```typescript
import pino from 'pino';

// Em produção, queremos velocidade máxima (JSON puro).
// Em desenvolvimento, queremos legibilidade no terminal.
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname', // Oculta dados de infraestrutura local
        },
      }
    : undefined, // Em produção, desativa o transport para manter o JSON bruto
});
```

### Passo 2: Integração com o Express (`src/app.ts`)

O `pino-http` atuará como um middleware global, registrando automaticamente todas as requisições, tempos de resposta e eventuais falhas.

```typescript
import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';

const app = express();

// O pinoHttp intercepta todas as requisições HTTP
app.use(pinoHttp({ logger }));

app.use(express.json());

// Exemplo de uso manual dentro da regra de negócio
app.post('/api/teste', (req, res) => {
  const userId = 123;

  // Utilização do logger customizado no lugar do console.log
  logger.info(
    { userId, action: 'acesso_rota_teste' },
    'Usuário acessou a rota de testes',
  );

  res.status(200).json({ message: 'ok' });
});

export { app };
```

### Testes Automatizados de Integração (E2E)

Para validar a implementação, é possível criar testes de integração que verificam se os logs estão sendo gerados corretamente. Isso pode ser feito utilizando bibliotecas como `supertest` para simular requisições e `pino` para capturar os logs gerados durante os testes.

```typescript
import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';
import { logger } from '../../src/utils/logger';
import { pinoHttp } from 'pino-http';

describe('[E2E] Logger Configuration & Middleware', () => {
  it('should have logger level set to silent in the test environment', () => {
    // Garante que o ambiente de testes nunca será poluído com logs acidentais
    expect(process.env.NODE_ENV).toBe('test');
    expect(logger.level).toBe('silent');
  });

  it('should use the logger inside a route lifecycle', async () => {
    const app = createApp();

    // Injetamos o middleware com a sua configuração
    app.use(pinoHttp({ logger, autoLogging: false }));

    // Criamos uma rota de teste para validar a injeção do logger
    app.get('/test-injection', (req, res) => {
      // Validação: o pino-http colocou o logger dentro do req?
      expect(req.log).toBeDefined();
      expect(typeof req.log.info).toBe('function');
      expect(typeof req.log.error).toBe('function');

      res.status(200).json({ success: true });
    });

    // 3. Disparamos a requisição e validamos
    const response = await request(app).get('/test-injection');

    expect(response.status).toBe(200);
  });
});
```
