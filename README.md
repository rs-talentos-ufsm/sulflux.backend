<a id="readme-top"></a>

<div align="center">

![Status](https://img.shields.io/badge/status-pronto--para--uso-success?style=for-the-badge)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](https://opensource.org/licenses/Apache-2.0)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js_5-000000?style=for-the-badge&logo=express&logoColor=white)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-000000?style=for-the-badge&logo=opentelemetry&logoColor=white)

![Vitest](https://img.shields.io/badge/Vitest-729B1B?style=for-the-badge&logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7B93E)

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

</div>

<h1 align="center">
    🛠️ Backend Template (Node.js + Express 5)
</h1>

<p align="center">
  A API RESTful de alta performance que serve de fundação para os projetos do monorepo. 
  <br />
  <a href="https://github.com/dornelesfernando/template"><strong>« Voltar para o Monorepo Raiz</strong></a>
  <br />
  <br />
  <a href="#visao-geral-do-template">Visão Geral</a>
  ·
  <a href="#documentacao-tecnica">Documentação Técnica</a>
  ·
  <a href="#como-rodar-a-api">Como Rodar</a>
</p>

---

<a id="visao-geral-do-template"></a>

## 🔎 Visão Geral do Template

Este repositório contém o **módulo Backend** da arquitetura base. Ele não é um projeto final, mas um _boilerplate_ altamente opinativo e configurado para produção, focado em segurança, observabilidade e tipagem End-to-End (E2E).

Ao utilizá-lo como base para seu novo projeto, você herda imediatamente:

- **Roteamento Moderno:** Express 5 operando sob Node.js, com suporte nativo a Promises sem necessidade de bibliotecas auxiliares de `try/catch`.
- **Validação e Tipagem Compartilhada:** Interceptadores de rota configurados para validar payloads estritamente com schemas do pacote `@lib/shared` (via Zod).
- **Acesso a Dados Seguro:** Conexão robusta ao PostgreSQL através do Prisma ORM 7, com migrations já mapeadas em scripts npm.
- **Segurança Pronta para Produção:** Camadas de proteção pré-configuradas com Helmet (Headers HTTP), Argon2 (Hashing de senhas de última geração), Express Rate Limit (Prevenção de DDoS) e JWT com Cookies seguros.
- **Observabilidade Total:** Logs estruturados assíncronos e incrivelmente rápidos via `pino` e rastreabilidade de microserviços embutida com `OpenTelemetry`.
- **Documentação Automática:** O pacote `@asteasolutions/zod-to-openapi` lê os schemas do seu negócio e gera a interface interativa do Swagger UI automaticamente.

---

<a id="documentacao-tecnica"></a>

## 📚 Documentação Técnica (Aprofundamento)

Este backend foi construído com ferramentas específicas que possuem configurações customizadas. Para entender as decisões arquiteturais e como utilizar cada módulo, consulte nossos guias internos na pasta `docs/`:

| Tópico de Estudo             | Arquivo de Documentação                                                                                                                        |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Banco de Dados (Prisma)**  | [`checklist-prisma.md`](./docs/checklist-prisma.md) e [`optmize-extension-prisma.md`](./docs/optmize-extension-prisma.md)                      |
| **Segurança & Senhas**       | [`Argon2.md`](./docs/Argon2.md), [`Helmet.md`](./docs/Helmet.md) e [`CORS-Restritivo.md`](./docs/CORS-Restritivo.md)                           |
| **Proteção de Tráfego**      | [`Express-Rate-Limit.md`](./docs/Express-Rate-Limit.md) e [`Headers.md`](./docs/Headers.md)                                                    |
| **Observabilidade & Traces** | [`OpenTelemetry.md`](./docs/OpenTelemetry.md), [`OpenTelemetry-interface.md`](./docs/OpenTelemetry-interface.md) e [`Pino.md`](./docs/Pino.md) |
| **Documentação Automática**  | [`Swagger.md`](./docs/Swagger.md)                                                                                                              |
| **Qualidade & Git Hooks**    | [`Husky.md`](./docs/Husky.md)                                                                                                                  |

---

<a id="como-rodar-a-api"></a>

## 🚀 Como Rodar a API

> **Aviso Importante:** Como este backend faz parte de um ecossistema Monorepo, **não inicie este projeto de forma isolada** antes de ler as instruções globais.

### 1. Configurações de Ambiente (Obrigatório)

Todas as chaves secretas (JWT), conexões de banco de dados e mapeamento de portas (`.env.development`, `.env.test`, etc.) possuem requisitos específicos.
👉 **[Leia o guia completo de instruções (`instructions.md`) antes de prosseguir](./instructions.md)**.

### 2. Ciclo de Vida Local

As tarefas do dia a dia (subir contêineres, rodar migrations, testes) são totalmente orquestradas. Não é necessário decorar comandos longos do Docker.

> **Dica:** É altamente recomendável que você orquestre os serviços através do **`Makefile` na raiz do monorepo** (`make dev-up`). No entanto, caso precise rodar os scripts de forma isolada _dentro desta pasta_:

- **Início do Servidor (Modo Dev):** `npm run dev-up`
- **Banco de Dados:** `npm run docker-migrate` (Aplica migrações no banco Dockerizado).
- **Acesso Visual aos Dados:** `npm run db-studio-dev` (Abre o Prisma Studio).
- **Testes Unitários/Integração:** `npm run test` (Sobe um banco de testes efêmero, roda o Vitest e destrói o banco).

---

<a id="autor"></a>

## 🎓 Autor

Template estruturado e mantido por:

- **Nome:** Fernando Dorneles da Silva
- **GitHub:** [dornelesfernando](https://github.com/dornelesfernando)

<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>
