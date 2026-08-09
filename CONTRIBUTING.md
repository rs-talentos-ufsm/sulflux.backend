# Guia de Contribuição

Obrigado pelo interesse em contribuir! Este guia descreve o processo de trabalho para colaborar com os repositórios criados e mantidos sob este projeto.

---

## Índice

- [Guia de Contribuição](#guia-de-contribuição)
  - [1. Código de Conduta](#1-código-de-conduta)
  - [2. Antes de Começar](#2-antes-de-começar)
  - [3. Como Reportar um Bug](#3-como-reportar-um-bug)
  - [4. Como Solicitar uma Funcionalidade](#4-como-solicitar-uma-funcionalidade)
  - [5. Como Enviar um Pull Request](#5-como-enviar-um-pull-request)
  - [6. Fluxo de Desenvolvimento](#6-fluxo-de-desenvolvimento)
  - [7. Diretrizes de Mensagem de Commit](#7-diretrizes-de-mensagem-de-commit)
  - [8. Estilo de Código e Automação](#8-estilo-de-código-e-automação)
  - [9. Obtendo Ajuda](#9-obtendo-ajuda)

---

## 1. Código de Conduta

Estamos comprometidos com um ambiente de desenvolvimento profissional, respeitoso e colaborativo.

- Seja claro, gentil e respeitoso em todas as interações (issues, reviews e chats).
- O foco da revisão (Code Review) é o código e a arquitetura, nunca o desenvolvedor.
- Aceite e forneça feedback de maneira construtiva.
- Faça perguntas; preferimos alinhar expectativas antes que você escreva centenas de linhas de código.

---

## 2. Antes de Começar

1. **Entenda o Ecossistema:** Este projeto utiliza arquitetura de Monorepo com submódulos. Entenda as diretrizes do monorepo no `README.md` raiz antes de começar.
2. **Configure seu ambiente:** Siga as instruções do guia de **Pré-requisitos e Setup** para garantir que ferramentas como WSL, Node LTS e Docker estejam operacionais.
3. **Verifique Issues Existentes:** Sua ideia de refatoração ou correção de bug pode já estar documentada ou em desenvolvimento.
4. **Alinhamento:** Para mudanças na arquitetura (como trocar uma biblioteca base) ou funcionalidades muito grandes, abra uma issue para discussão prévia.

---

## 3. Como Reportar um Bug

1. Verifique se o bug já não está listado nas issues do repositório.
2. Abra uma nova issue fornecendo:
   - Um título objetivo.
   - Passos exatos para reproduzir (ex: "cliquei no botão X e a API retornou 500").
   - O comportamento esperado vs. o comportamento atual.
   - Detalhes do ambiente (versão do Node, Docker, etc.).
   - Logs de erro ou prints de tela (se aplicável).

---

## 4. Como Solicitar uma Funcionalidade

1. Abra uma issue detalhando a necessidade.
2. Foque primeiro no **problema** que precisa ser resolvido, e depois sugira a sua **solução**.
3. Aguarde a validação arquitetural antes de iniciar o desenvolvimento.

---

## 5. Como Enviar um Pull Request (PR)

### Referência Rápida (Exemplo Front/Back)

```bash
# 1. Garanta que seu repositório local está atualizado
git checkout main
git pull origin main

# 2. Crie uma branch específica para sua alteração
git checkout -b feat/add-payment-gateway

# 3. Desenvolva, teste e faça o linting localmente
npm run lint-check
npm run test

# 4. Adicione e faça o commit seguindo o padrão
git add .
git commit -m "feat(checkout): integra api de pagamentos stripe"

# 5. Faça o push e abra o PR no GitHub
git push origin feat/add-payment-gateway

```

### Requisitos do Pull Request

- **Isolamento:** Mantenha os PRs pequenos e com escopo único. Não misture formatação de código com criação de novas rotas no mesmo PR.
- **Rastreabilidade:** Se o PR resolve uma issue, cite-a na descrição (ex: `Closes #12`).
- **Verificações:** O repositório possui Husky (Git Hooks). Se o seu código não passar nos testes ou linting, o commit será bloqueado localmente.
- **Aprovação:** Todo código deve ser revisado por pelo menos um desenvolvedor além do autor antes do merge.

---

## 6. Fluxo de Desenvolvimento e Git

O projeto adota uma variação simplificada do **GitHub Flow**:

1. **A branch `main` (ou `master`) reflete o ambiente de produção.** Nunca faça commits diretamente nela.
2. Crie branches a partir do `main` mais recente.
3. Se o PR for aprovado, o merge é feito via "Squash and Merge" ou "Rebase" para manter o histórico limpo.
4. A branch de funcionalidade deve ser excluída após o merge.

### Nomenclatura de Branches

Para facilitar a identificação, inicie o nome da branch com o tipo de trabalho:

- `feat/descricao-curta` : Novas funcionalidades.
- `fix/descricao-curta` : Correções de bugs.
- `docs/descricao-curta` : Atualizações em Readmes ou guias.
- `refactor/descricao-curta` : Melhorias de código sem impacto externo.
- `chore/descricao-curta` : Atualização de dependências ou configurações de build/Docker.

---

## 7. Diretrizes de Mensagem de Commit

Nós adotamos o padrão [Conventional Commits](https://www.conventionalcommits.org/). Ele ajuda a gerar logs de versão (changelogs) automaticamente.

Formato esperado:

```
<tipo>(<escopo opcional>): <assunto em letras minúsculas>

```

**Exemplos corretos:**

- `feat(auth): adiciona verificacao de mfa no login`
- `fix(api): corrige retorno 500 na rota de usuarios`
- `docs(readme): atualiza instrucoes do docker`
- `refactor(db): migra queries antigas para o prisma`
- `chore: atualiza pacotes do eslint`

---

## 8. Estilo de Código e Automação

O projeto é estritamente tipado (TypeScript) e possui regras estáticas fortes.

- **ESLint & Prettier:** São os donos da formatação. Antes de enviar código, rode `npm run format-fix` e `npm run lint-fix`. O código não será aceito se houverem erros no linter.
- **Husky:** Está configurado para rodar os testes e o linter em _pre-commit_. Não tente burlar (bypass) os hooks (`--no-verify`). Se o hook falhou, o código não está pronto.
- **Zod:** Todos os esquemas de validação devem residir no pacote `@lib/shared`. Nunca duplique validações no Frontend e Backend de forma isolada.

---

## 9. Obtendo Ajuda

Se você travou em algum ponto do desenvolvimento, configuração do WSL, ou não entendeu um erro do TypeScript:

- Consulte os arquivos da pasta `docs/`.
- Abra uma issue de dúvida caso o comportamento da aplicação pareça errático.
- Marque o autor/mantenedor (`@dornelesfernando`) nos comentários do seu Pull Request para pedir orientação ou Code Review focado em um trecho específico.

## Muito ... Obrigado!

Muito obrigado por ler até aqui! A colaboração é o que torna este projeto vivo e relevante. Sinta-se à vontade para contribuir, sugerir melhorias ou simplesmente dar feedback sobre a experiência de desenvolvimento. Estamos ansiosos para ver suas contribuições!

### É um grande prazer poder tornar o imaginário possível com você! 🚀
