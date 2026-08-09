# Configuração de Segurança: CORS Restritivo no Express

O **CORS** é um mecanismo de segurança essencial que permite (ou restringe) que recursos de um servidor sejam acessados por páginas web de domínios diferentes. Sem uma configuração explícita, o navegador bloqueia requisições entre origens distintas por padrão (**Same-Origin Policy**).

## 1. O que é e por que é fundamental?

Em uma arquitetura de API moderna, seu backend e seu frontend geralmente rodam em domínios ou portas diferentes (ex: Backend na 5000 e Frontend na 5173). O CORS é o protocolo que "abre a porta" de forma controlada.

### Riscos de um CORS mal configurado:

- **Exposição de Dados (O perigo do asterisco `*`):** Na área de infraestrutura, o asterisco (`*`) funciona como um "curinga" que significa "Todos" ou "Qualquer um". Usar `origin: '*'` na sua regra de CORS é o equivalente a dizer aos navegadores: _"Eu confio em qualquer site da internet"_. Isso é extremamente perigoso em produção, pois se o seu usuário estiver logado e abrir um site pirata, scripts maliciosos escondidos nessa página poderão fazer requisições à sua API e roubar os dados privados dele sem que ele perceba.
- **Ataques de CSRF:** Embora o CORS não seja a única defesa contra CSRF, ele é uma camada crítica para garantir que apenas seus domínios confiáveis interajam com o servidor.

## 2. Instalação

Como você utiliza **TypeScript**, instalaremos o pacote e as definições de tipo necessárias:

```bash
npm install cors
npm install -D @types/cors

```

## 3. Implementação

Para um projeto profissional, a configuração deve ser dinâmica, utilizando uma **Whitelist** (Lista Branca) que pode ser alimentada por variáveis de ambiente.

### Exemplo de Configuração (`src/app.ts`)

```typescript
import express from 'express';
import cors from 'cors';

const app = express();

/**
 * CONFIGURAÇÃO DO CORS
 * As origens podem ser flexíveis.
 */
const allowedOrigins = [
  'http://localhost:5173', // Frontend local (Vite)
  'http://localhost:3000', // Outro padrão comum
  process.env.FRONTEND_URL, // URL de produção vinda do .env
].filter(Boolean) as string[]; // Remove valores nulos/indefinidos

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem 'origin' (comuns em Mobile ou ferramentas como Insomnia/Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Bloqueia a requisição se a origem não for permitida
      callback(new Error('Acesso negado pela política de CORS do servidor'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  credentials: true, // Necessário se você usar Cookies ou Headers de Autenticação
  maxAge: 86400, // Cache da resposta do Preflight (24 horas) para performance
};

// Aplicação do middleware
app.use(cors(corsOptions));

app.use(express.json());
```

## 4. Testando o Comportamento: Antes vs Depois

### Cenário A: Sem CORS ou com Origem Bloqueada

Se você tentar acessar a API de um domínio não listado:

```bash
curl -I -H "Origin: http://site-malicioso.com" http://localhost:5000/api/health

```

**Resultado:** O servidor não retornará os cabeçalhos `Access-Control-Allow-Origin`. O navegador, ao perceber isso, bloqueará a resposta para o frontend.

### Cenário B: Com CORS configurado (Origem Permitida)

```bash
curl -I -H "Origin: http://localhost:5173" http://localhost:5000/api/health

```

**Resposta esperada (Headers):**

- `Access-Control-Allow-Origin: http://localhost:5173`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH`
- `Access-Control-Allow-Credentials: true`

---

### Nota de Segurança:

- **Ataques de CSRF:** (Cross-Site Request Forgery ou Falsificação de Solicitação entre Sites) enganam navegadores para executar ações indesejadas em sites onde o usuário está autenticado, como alterar senhas, e-mails ou realizar transferências bancárias. O atacante induz a vítima a clicar em links maliciosos, aproveitando cookies de sessão ativos.
