# 🐶 Guia de Configuração: Husky & Lint-Staged

Este documento descreve a arquitetura de qualidade de código automatizada. Utilizamos o **Husky** em conjunto com o **Lint-Staged** para garantir que nenhum código fora do padrão ou quebrado seja enviado para o histórico do Git.

---

## 1. O que são essas ferramentas?

- **Husky:** É um orquestrador de Git Hooks. Ele intercepta ações do Git (como `commit` ou `push`) e executa scripts do Node.js antes de permitir que a ação seja concluída.
- **Lint-Staged:** É um otimizador de performance. Em vez de rodar o linter (ESLint) e o formatador (Prettier) no projeto inteiro (o que demora minutos em projetos grandes), ele executa esses comandos **apenas nos arquivos que estão em _staged_** (arquivos que você adicionou com `git add`).

## 2. Por que configuramos assim?

Rodar `npm run lint:fix` e `npm run format:fix` no `pre-commit` tradicional força a máquina a ler todos os arquivos do projeto a cada commit. Nossa configuração atual:

1. **É instantânea:** Só formata o que você acabou de alterar.
2. **É segura:** Roda a suíte de testes (`npm run test`) para barrar commits que quebrem o sistema.
3. **É automática:** Ninguém no time precisa lembrar de formatar o código antes de subir.

---

## 3. Passo a Passo da Configuração (Arquitetura Atual)

Se precisar recriar a configuração do zero, siga os passos abaixo:

### Passo 1: Instalar o Lint-Staged

O Husky já é padrão no projeto, mas precisamos do Lint-Staged como dependência de desenvolvimento:

```bash
npm install -D lint-staged

```

### Passo 2: Configurar o `package.json`

Dividimos os scripts de inicialização para não gerar conflito entre o Prisma e o Husky, e adicionamos as regras do Lint-Staged no final do arquivo:

```json
{
  "scripts": {
    "prepare": "husky",
    "postinstall": "npm run prisma:generate"
  },
  "lint-staged": {
    "*.{ts,js,json,md}": ["prettier --write", "eslint --fix"]
  }
}
```

### Passo 3: Inicializar o Husky

Para criar a pasta `.husky/` e registrar os hooks locais no repositório:

```bash
npx husky init

```

### Passo 4: Criar o Hook de Pre-Commit

Dentro da pasta `.husky/`, o arquivo `pre-commit` deve conter exatamente os dois comandos de segurança: o formatador inteligente e o guardião de testes.

**Arquivo: `.husky/pre-commit**`

```sh
npx lint-staged
npm run test

```

---
