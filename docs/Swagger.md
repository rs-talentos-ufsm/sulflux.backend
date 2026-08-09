# Documentação Automática: Swagger + Zod (Shared)

A documentação de uma API costuma ser a parte mais negligenciada de um projeto porque, geralmente, exige trabalho dobrado: escrever o código e depois escrever o documento. Ao integrar o Swagger com o **Zod**, transformamos seus schemas de validação na própria documentação.

## 1. O que é e por que usar?

- **OpenAPI (Swagger):** É o padrão global para descrever APIs REST. Ele cria uma página interativa (geralmente em `/api-docs`) onde qualquer desenvolvedor pode testar os endpoints sem usar o Postman ou Insomnia.
- **A Estratégia Shared:** Como os schemas (como `createUserSchema`) já estão no `shared`, a documentação será **sempre fiel ao código**. Se algo mudar um campo no shared, a documentação atualiza sozinha.

## 2. Arquitetura do Registry

Diferente da abordagem manual, o uso do OpenAPIRegistry permite que a definição do esquema e sua identificação para a documentação ocorram simultaneamente. Isso reduz o acoplamento e evita erros de nomenclatura entre o backend e a biblioteca compartilhada.

## 3. Instalação

Para a viabilização da documentação automática no serviço de backend, as seguintes dependências devem estar presentes no ambiente:

```bash
# Renderizador e gerador
npm install swagger-ui-express swagger-jsdoc @asteasolutions/zod-to-openapi

# Tipagens
npm install -D @types/swagger-ui-express @types/swagger-jsdoc

```

## 4. Preparando o `shared`

Para que o Zod consiga "falar" com o Swagger, precisamos estender a biblioteca no seu arquivo de schemas dentro do pacote compartilhado.

**No `shared` (ex: `users.schema.ts`):**

```typescript
import { z } from '@lib/shared';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Estende o Zod uma única vez
extendZodWithOpenApi(z);

export const createUserSchema = z
  .object({
    name: z.string().min(2).openapi({ example: 'Fernando Dorneles' }),
    email: z.email().openapi({ example: 'dorneles@ufsm.br' }),
    // ... resto do seu código
  })
  .openapi('CreateUser'); // <--- Nome que aparecerá no Swagger
```

## 5. Implementação no `backend`

Agora, configuramos o "Mapper" que vai consolidar tudo.

### Passo A: O Gerador de Documentação (`src/utils/swagger.ts`)

```typescript
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { createUserSchema } from '@lib/shared'; // Seu pacote shared

export const setupSwagger = (app: Express) => {
  const registry = new OpenAPIRegistry();

  // Registra seus schemas do Shared para o Swagger conhecer
  registry.register('User', createUserSchema);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  const docs = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'backend API',
      description: 'Documentação integrada via Zod Schemas',
    },
    servers: [{ url: 'http://localhost:5000' }],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(docs));
};
```

### Passo B: Integração no `src/app.ts`

```typescript
import express from 'express';
import { setupSwagger } from './utils/swagger';

const app = express();
app.use(express.json());

// Inicia a documentação
setupSwagger(app);

export { app };
```

---

## 6. Como Testar e Validar

1. Inicie o backend no Docker ou WSL: `npm run dev:upd`.
2. Acesse `http://localhost:5000/api-docs`.
3. Você verá a seção **Schemas** no final da página com o seu `CreateUser` exatamente como definido no Zod, incluindo as validações de `min`, `max` e os exemplos que você adicionou.

## 7. Vantagens para o Fluxo

- **Single Source of Truth:** O `shared` é o dono da verdade. Não há risco da documentação dizer que um campo é opcional enquanto o backend o exige como obrigatório.
- **Segurança de Tipos:** Se você remover um campo do DTO no shared, o TypeScript no backend acusará erro e a documentação parará de exibir o campo automaticamente.
- **Agilidade:** Para documentar uma nova rota, basta registrar o schema no `registry` do Swagger. É um processo de segundos.
