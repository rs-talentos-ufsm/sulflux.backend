# 🛠️ Instruções Locais de Configuração e Execução (Backend)

Este documento detalha como configurar as variáveis de ambiente necessárias para a API e como executar os comandos de desenvolvimento diretamente dentro da pasta `apps/backend`, sem depender do orquestrador global (`Makefile`).

---

## 🔐 1. Configuração do Arquivo `.env`

A aplicação requer configurações locais para rodar corretamente. Crie uma cópia do arquivo de exemplo para o seu ambiente de desenvolvimento:

```bash
cp .env.example .env.development

```

Abaixo está a explicação detalhada de cada variável presente no seu `.env` e como preenchê-las:

### Configurações Globais

| Variável       | Descrição                                                            | Exemplo de Valor |
| -------------- | -------------------------------------------------------------------- | ---------------- |
| `PROJECT_NAME` | Nome do projeto para identificação nos contêineres Docker e logs.    | `meu_projeto`    |
| `NODE_ENV`     | Define o ambiente de execução (`development`, `test`, `production`). | `development`    |
| `BACKEND_PORT` | Porta onde a API Node.js/Express será exposta na sua máquina.        | `5000`           |

### Banco de Dados (PostgreSQL)

Para o ambiente Dockerizado, o host deve ser o nome do serviço do banco de dados no `docker-compose.yml`.

| Variável       | Descrição                                                                                           | Exemplo de Valor                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DB_DIALECT`   | O dialeto do banco de dados utilizado.                                                              | `postgres`                                                               |
| `DB_HOST`      | Host do banco. Use `db` se estiver rodando via Docker, ou `localhost` se rodar o banco solto no SO. | `db`                                                                     |
| `DB_PORT`      | Porta interna do banco de dados.                                                                    | `5432`                                                                   |
| `DB_NAME`      | Nome do banco de dados.                                                                             | `app_database`                                                           |
| `DB_USER`      | Usuário administrador do banco.                                                                     | `admin`                                                                  |
| `DB_PASSWORD`  | Senha de acesso ao banco.                                                                           | `sua_senha_segura`                                                       |
| `DATABASE_URL` | String de conexão completa exigida pelo Prisma ORM. Ela é montada a partir das variáveis acima.     | `postgresql://admin:sua_senha_segura@db:5432/app_database?schema=public` |

### Segurança e Autenticação

| Variável     | Descrição                                                                                        | Exemplo de Valor |
| ------------ | ------------------------------------------------------------------------------------------------ | ---------------- |
| `JWT_SECRET` | Chave criptográfica usada para assinar os tokens JWT. Gere uma usando `openssl rand -base64 32`. | `k3/Z... (hash)` |

### Observabilidade e Tracing (OpenTelemetry + Jaeger)

| Variável                      | Descrição                                                     | Exemplo de Valor        |
| ----------------------------- | ------------------------------------------------------------- | ----------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | URL para envio das métricas (Tracing).                        | `http://jaeger:4318`    |
| `OTEL_SERVICE_NAME`           | Nome do serviço para aparecer no dashboard do Jaeger.         | `backend-api`           |
| `OTEL_RESOURCE_ATTRIBUTES`    | Metadados extras, como versão.                                | `service.version=1.0.0` |
| `OTLP_GRPC_PORT`              | Porta GRPC do Jaeger (se necessário).                         | `4317`                  |
| `OTLP_HTTP_PORT`              | Porta HTTP do Jaeger para envio de logs/traces.               | `4318`                  |
| `JAEGER_PORT`                 | Porta para acessar a interface visual do Jaeger no navegador. | `16686`                 |

### Otimizações

| Variável                | Descrição                                                                             | Exemplo de Valor |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| `PRISMA_OPTIMIZE_TOKEN` | (Opcional) Token para usar a plataforma Prisma Optimize. Deixe vazio se não utilizar. | `""`             |

---

## ⚠️ 2. Primeira Execução do Projeto

Ao executar o ambiente pela primeira vez, ou após utilizar comandos como:

```bash
npm run dev-reset
```

ou:

```bash
docker system prune -a --volumes
```

o banco de dados será recriado vazio, sem nenhuma tabela do Prisma.

Após subir os contêineres, é obrigatório executar as migrações para sincronizar o banco de dados com o `schema.prisma`:

```bash
npm run docker-migrate
```

Esse comando aplica todas as migrations dentro do contêiner Docker do backend utilizando o serviço definido no `docker-compose`.

Opcionalmente, você também pode popular o banco com dados iniciais de desenvolvimento:

```bash
npm run seed
```

Sem executar as migrations, a API poderá apresentar erros semelhantes a:

```txt
The table `public.users` does not exist in the current database.
```

Recomendação de fluxo para primeira execução:

```bash
npm run dev-upd
npm run docker-migrate
npm run seed
```

---

## 💻 3. Executando Comandos Localmente (NPM Scripts)

Caso você esteja trabalhando exclusivamente no Backend e não queira usar o `Makefile` da raiz, você pode usar os scripts nativos definidos no `package.json`.

> **Atenção:** Certifique-se de estar dentro da pasta `apps/backend` no seu terminal antes de rodar os comandos abaixo.

### 🐳 Gerenciamento do Ambiente (Docker)

Os scripts abaixo sobem toda a infraestrutura local (API + PostgreSQL) lendo o seu `.env.development`.

- `npm run dev-up` : Sobe os contêineres e exibe os logs travando o terminal atual.
- `npm run dev-upd` : Sobe os contêineres em **background (detached)** e libera o terminal.
- `npm run dev-down` : Desliga os contêineres, mas **mantém os dados** salvos no volume.
- `npm run dev-reset` : Destrói os contêineres e **apaga o banco de dados** (Hard Reset).
- `npm run log` : Conecta ao contêiner em background e exibe os logs em tempo real.

### 🗄️ Interação com o Banco de Dados (Prisma)

Como a aplicação roda via Docker, os comandos do Prisma precisam interagir com o contêiner em execução.

- `npm run docker-generate` : Atualiza a tipagem do Prisma Client baseada no `schema.prisma`.
- `npm run docker-migrate` : Aplica as migrações no banco de dados dentro do Docker e sincroniza as tabelas.
- `npm run seed` : Roda o script de semeadura (`prisma/seed.ts`) para popular o banco com dados iniciais de teste.
- `npm run db-studio-dev` : Abre a interface visual do **Prisma Studio** no seu navegador para você visualizar e editar as tabelas diretamente.

### 🧪 Qualidade e Testes

Nossos testes são isolados. Eles sobem uma instância paralela de banco de dados temporária, executam as validações e destroem o banco em seguida.

- `npm run test` : Executa a suíte de testes (Vitest) ponta a ponta uma única vez.
- `npm run test-watch` : Inicia o Vitest em modo de observação (ótimo para TDD).
- `npm run lint-check` : Verifica erros estáticos e de padrão de código (ESLint).
- `npm run format-fix` : Corrige formatação de código automaticamente usando o Prettier.

```

```
