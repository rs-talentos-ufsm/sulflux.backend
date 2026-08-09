# Guia de Implementação e Validação: Segurança com Helmet

A segurança é uma camada indispensável em uma arquitetura de backend escalável e robusta. Para proteger a aplicação contra vulnerabilidades web comuns, a adoção do **Helmet** atua como uma linha de defesa primária diretamente na camada de rede.

Abaixo está a documentação técnica completa sobre o funcionamento da ferramenta, o processo de integração e as metodologias de validação.

---

## 1. O que é o Helmet?

O Helmet não é um único middleware, mas sim uma coleção de funções de middleware menores para o framework Express.js. Ele atua interceptando as requisições HTTP e configurando automaticamente cabeçalhos (headers) de resposta de segurança essenciais.

Sua principal função é proteger a aplicação contra ataques conhecidos, como:

- **Cross-Site Scripting (XSS):** Previne que scripts maliciosos sejam injetados e executados pelo navegador do cliente.
- **Clickjacking:** Impede que a aplicação seja renderizada dentro de um `<frame>` ou `<iframe>` em sites de terceiros, evitando que usuários sejam enganados e cliquem onde não pretendiam.
- **MIME Sniffing:** Bloqueia o navegador de tentar "adivinhar" o tipo de conteúdo (MIME type), forçando-o a respeitar o tipo declarado pelo servidor e evitando a execução de arquivos disfarçados.

---

## 2. Instalação e Configuração

A instalação é direta e deve ser adicionada às dependências principais do projeto.

**Comando de Instalação:**

```bash
npm install helmet

```

### Integração na Arquitetura

O Helmet deve ser inicializado o mais cedo possível no ciclo de vida da aplicação, garantindo que todas as rotas e requisições subsequentes herdem os cabeçalhos de segurança. A configuração ideal ocorre no arquivo de entrada principal da instância do servidor.

**Arquivo:** `src/app.ts`

```typescript
import express from 'express';
import helmet from 'helmet';

// Importação das rotas e outros middlewares
import routes from './routes';

const app = express();

// 1. Injeção do Helmet logo na inicialização
app.use(helmet());

// 2. Parsers e outros middlewares básicos
app.use(express.json());

// 3. Definição das rotas da API
app.use('/api', routes);

export { app };
```

---

## 3. Metodologia de Teste: Antes e Depois

Para garantir que a implementação foi bem-sucedida, é necessário analisar o tráfego HTTP bruto. Isso pode ser feito via terminal ou através de testes automatizados.

### Teste Manual via cURL

Levante o ambiente de desenvolvimento local e execute requisições contra o servidor para observar os cabeçalhos retornados.

**Cenário A: Servidor SEM Helmet**
Executando um GET simples:

```bash
curl -I http://localhost:3000/api/health

```

_Saída Padrão Esperada:_

> `HTTP/1.1 200 OK`
> `X-Powered-By: Express`
> `Content-Type: application/json; charset=utf-8`

**Análise de Risco:** O cabeçalho `X-Powered-By` expõe a tecnologia exata utilizada no backend, facilitando o mapeamento de vulnerabilidades por agentes maliciosos. Não há proteções ativas contra manipulação de iframe ou sniffing.

**Cenário B: Servidor COM Helmet**
Executando o mesmo comando após a implementação:

```bash
curl -I http://localhost:3000/api/health

```

_Saída Padrão Esperada:_

> `HTTP/1.1 200 OK`
> `Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';...`
> `Cross-Origin-Opener-Policy: same-origin`
> `Cross-Origin-Resource-Policy: same-origin`
> `X-DNS-Prefetch-Control: off`
> `X-Frame-Options: SAMEORIGIN`
> `Strict-Transport-Security: max-age=15552000; includeSubDomains`
> `X-Download-Options: noopen`
> `X-Content-Type-Options: nosniff`
> `X-XSS-Protection: 0`

**Análise de Sucesso:** A assinatura `X-Powered-By` foi removida. O cabeçalho `X-Content-Type-Options` protege contra MIME sniffing, e o `X-Frame-Options` mitiga ataques de clickjacking.

### Testes Automatizados de Integração (E2E)

Para garantir que futuras atualizações não removam essas proteções acidentalmente, a validação dos cabeçalhos deve ser incorporada à suíte de testes E2E utilizando Vitest e Supertest.

**Arquivo:** `tests/middlewares/helmet.e2e.spec.ts`

```typescript
import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';
import { logIfFail } from '../helpers/testLogger';

describe('[E2E] Security Headers Middleware', () => {
  const app = createApp();

  it('should inject helmet security headers and remove x-powered-by', async () => {
    const response = await request(app).get('/api/health');

    // Garante que a rota respondeu corretamente
    expect(response.status).toBe(200);

    // 1. Verifica se o header que vaza a tecnologia (Express) foi removido
    expect(response.headers['x-powered-by']).toBeUndefined();

    // 2. Verifica a injeção dos cabeçalhos estáticos do Helmet
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-xss-protection']).toBe('0');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-download-options']).toBe('noopen');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe(
      'same-origin',
    );

    // 3. Verifica os cabeçalhos mais complexos (HSTS e CSP)
    // Usamos toContain para não quebrar o teste caso você adicione novas regras no CSP no futuro
    expect(response.headers['strict-transport-security']).toContain(
      'max-age=31536000',
    );
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
  });
});
```

---

### Nota de Segurança:

- **Cross-Site Scripting (XSS):** é uma vulnerabilidade de segurança web onde atacantes injetam scripts maliciosos (geralmente JavaScript) em sites legítimos. Quando usuários visitam a página, o navegador executa o script, permitindo o roubo de cookies de sessão, sequestro de contas e a manipulação do conteúdo da página.

- **Clickjacking:** ou "sequestro de clique", é um ataque cibernético onde criminosos enganam usuários para clicarem em botões ou links invisíveis sobrepostos a sites legítimos. Essa técnica usa iframes transparentes para fazer o usuário realizar ações indesejadas, como baixar malware, transferir dinheiro ou revelar dados pessoais.

- **MIME Sniffing:** é uma técnica onde navegadores web examinam o conteúdo de um arquivo (os primeiros bytes) para determinar seu tipo real, ignorando o cabeçalho Content-Type enviado pelo servidor. É um mecanismo de "adivinhação" para exibir arquivos corretamente quando o servidor envia metadados incorretos ou ausentes, mas pode ser explorado para executar scripts maliciosos.
