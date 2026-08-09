# Controle de Tráfego: Rate Limiting com Express

O **Rate Limiting** (Limite de Taxa) é um mecanismo de defesa que controla a taxa de requisições que um usuário pode fazer à sua API em um determinado período. Imagine-o como um "porteiro" que impede que um único visitante sature o servidor, garantindo que todos tenham acesso justo aos recursos. É a principal defesa contra abusos que visam esgotar os recursos de processamento e memória da sua API.

## 1. O que é e por que usar?

Imagine que um usuário mal-intencionado crie um script para enviar 10.000 requisições por segundo para a sua rota de busca. Sem o Rate Limiting, o seu banco de dados **PostgreSQL** seria sobrecarregado, elevando a latência e possivelmente derrubando o serviço para todos os outros usuários legítimos.

### Principais Benefícios:

- **Mitigação de Ataques DoS/DDoS:** Impede que bots derrubem sua API por excesso de requisições.
- **Proteção contra Brute-Force:** Dificulta a quebra de senhas em rotas de login ao limitar as tentativas por IP.
- **Estabilidade de Recursos:** Evita que processos pesados (como buscas complexas no PostgreSQL via Prisma ) esgotem a CPU/RAM do container.
- **Justiça no Uso de Recursos:** Garante que um único usuário ou bot não monopolize a largura de banda e o processamento do servidor.
- **Economia de Banda:** Em infraestruturas autoescaláveis (Cloud), evita que picos artificiais de tráfego gerem cobranças excessivas. Reduz custos de tráfego desnecessário.

## 2. Instalação

A instalação é simples e deve ser adicionada às dependências principais do projeto. O `express-rate-limit` é a biblioteca mais popular para essa função, oferecendo uma configuração flexível e suporte nativo para TypeScript.

**Comando de Instalação:**

```bash
npm install express-rate-limit

```

## 3. Configuração Passo a Passo

A configuração deve ser aplicada como um middleware global ou específico para certas rotas. No contexto do projeto, a aplicação global garante que toda a estrutura de módulos (dentro de `src/modules/`) esteja protegida por padrão.

### Configuração Sugerida (`src/app.ts`)

```typescript
import express from 'express';
import { rateLimit } from 'express-rate-limit';

const app = express();

// Definição da política de limite
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 100, // Limite de 100 requisições por IP por janela
  message: {
    status: 429,
    error: 'Too Many Requests',
    message:
      'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.',
  },
  standardHeaders: true, // Retorna os cabeçalhos modernos 'RateLimit-*'
  legacyHeaders: false, // Desativa os cabeçalhos antigos 'X-RateLimit-*'
});

// Aplicação do middleware antes das rotas
app.use(limiter);

app.use(express.json());

// Exemplo de rota protegida
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'operacional' });
});

export { app };
```

## 4. Como Validar a Proteção

Diferente de outras ferramentas de segurança, o Rate Limiting é visível diretamente nos cabeçalhos de resposta HTTP, permitindo que o cliente saiba quanto do seu "crédito" de requisições ainda resta.

### Teste 1: Validação de Cabeçalhos

Execute uma requisição comum:

```bash
curl -I http://localhost:5000/api/health

```

**Saída esperada:**

- `ratelimit-limit: 100` (Seu limite total)
- `ratelimit-remaining: 99` (Quantas restam nesta janela)
- `ratelimit-reset: 450` (Segundos para o contador zerar)

### Teste 2: Estresse e Bloqueio (Simulando Ataque)

Execute um loop rápido para estourar o limite (considerando o limite de 100):

```bash
for i in {1..110}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/health; done

```

**Resultado esperado:** As primeiras 100 requisições retornarão `200`. A partir da 101ª, o servidor retornará `429` (Too Many Requests).

---

## 5. Dicas (Contexto 2026)

- **Rotas Sensíveis:** pode-se criar limitadores específicos (mais rigorosos) apenas para a rota de login:

```typescript
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // Apenas 5 tentativas de login por hora
  message: 'Muitas tentativas de login. Tente novamente mais tarde.',
});
app.use('/api/auth/login', authLimiter);
```

### Testes Automatizados de Integração (E2E)

Para garantir que futuras atualizações não removam essas proteções acidentalmente, a validação dos cabeçalhos deve ser incorporada à suíte de testes E2E utilizando Vitest e Supertest.

**Arquivo:** `tests/middlewares/rate-limit.e2e.spec.ts`

```typescript
import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';
import { logIfFail } from '../helpers/testLogger';

describe('[E2E] Rate Limit Middleware', () => {
  it('should block requests after exceeding the rate limit', async () => {
    const app = createApp();

    const TEST_LIMIT = 5; // Limite definido para ambiente de teste no app.ts

    // Rota utilizada para testar o Rate Limit (pode ser qualquer rota, desde que exista no app)
    const endpoint = '/api/health';

    // 1. Dispara requisições até o limite permitido
    for (let i = 0; i < TEST_LIMIT; i++) {
      const response = await request(app).get(endpoint);

      // Enquanto estiver dentro do limite, a rota de health deve retornar 200
      expect(response.status).toBe(200);

      // O Rate Limit injeta headers informativos que podemos validar (opcional)
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    }

    // 2. A PRÓXIMA requisição deve ser bloqueada
    const blockedResponse = await request(app).get(endpoint);

    // 3. Verifica se o Rate Limit agiu corretamente
    expect(blockedResponse.status).toBe(429); // 429 Too Many Requests
    expect(blockedResponse.body.message).toContain(
      'Você excedeu o limite de requisições. Por favor, tente novamente mais tarde.',
    );
  });
});
```

---

### Nota de Segurança:

- **DoS e DDoS:** São ataques que visam tornar um serviço indisponível para os usuários legítimos, sobrecarregando-o com um volume massivo de tráfego falso. O DoS é originado de uma única fonte, enquanto o DDoS é originado de múltiplas fontes, tornando-o mais difícil de mitigar. O Rate Limiting é uma defesa crucial contra esses tipos de ataques, ajudando a proteger a disponibilidade do seu serviço.

- **DoS (Denial of Service ou Negação de Serviço)** se diferencia de **DDoS (Distributed Denial of Service ou Negação de Serviço Distribuída)** principalmente pela origem do ataque. O DoS é originado de uma única fonte, enquanto o DDoS é originado de múltiplas fontes, tornando-o mais difícil de mitigar.
