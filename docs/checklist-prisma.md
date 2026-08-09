# Checklist Diário do Desenvolvedor: Alterações no Prisma

Sempre que você abrir o arquivo `schema.prisma` e adicionar, remover ou alterar algo (como a adição da coluna `deletedAt`), siga estritamente esta ordem para manter o ambiente sincronizado:

### 1. Garanta que os containers estão rodando

```bash
npm run dev:up

```

**Por que fazer isso?** O Prisma não gera migrações no escuro. Ele precisa se conectar ao banco de dados em execução para comparar as tabelas atuais com as novas alterações do seu arquivo e, assim, calcular exatamente qual código SQL precisa ser gerado.

---

### 2. Gere a migração dentro do container de desenvolvimento

```bash
npm run docker:migrate --name descricao_da_mudanca

```

**Por que fazer isso?** Rodar o comando _dentro_ do container (via script do NPM) evita erros de conexão (`P1001`), pois lá dentro o host `db` é reconhecido nativamente. Esse comando resolve três problemas de uma vez: cria o arquivo de histórico SQL, aplica a alteração no banco de desenvolvimento e atualiza os tipos do TypeScript para o seu código não dar erro.

---

### 3. Rode a sua suíte de testes

```bash
npm run test

```

**Por que fazer isso?** Seu banco de testes é um ambiente isolado. Como configuramos o seu script `test` para rodar um `prisma db push` oculto usando o `.env.test`, rodar os testes garante que o banco de dados efêmero receba as novas tabelas/colunas antes de o Vitest disparar, impedindo que os testes quebrem por falta de estrutura.
