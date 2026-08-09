# Banco de Dados de Alta Performance: Otimização e Extensões com Prisma 7

Para garantir um sistema resiliente, auditável e extremamente veloz, precisamos explorar os recursos nativos mais modernos do ecossistema do Prisma: o **Prisma Optimize** para análise de índices e as **Prisma Client Extensions** para lógica automatizada de _Soft Delete_ e _Auditoria_.

---

## 1. O que é o Prisma Optimize?

O **Prisma Optimize** é a ferramenta de inteligência de performance do Prisma. Ele atua como um consultor de banco de dados (DBA) automatizado, monitorando o perfil de execução das queries geradas pela aplicação e fornecendo recomendações cirúrgicas de otimização.

### Principais Benefícios:

- **Descoberta de Gargalos:** Ele identifica quais queries estão gerando _Full Table Scans_ (quando o PostgreSQL precisa ler a tabela inteira em disco por falta de um índice).
- **Sugestão Automatizada de Índices:** Em vez de adivinhar onde colocar índices, o Optimize analisa o padrão de busca da sua API e gera o comando SQL exato do índice necessário.
- **Métricas Visuais de Query:** Integra-se perfeitamente ao ecossistema, exibindo gráficos de latência por instrução executada.

---

## 2. O que são Prisma Client Extensions?

Introduzidas para substituir os antigos middlewares globais do Prisma, as **Extensions** permitem estender as funcionalidades nativas do Prisma Client (`prisma.user`, `prisma.project`) injetando comportamentos customizados, métodos globais e validações de forma 100% tipada com o TypeScript.

### Por que escolher as Extensions em vez de Middlewares?

- **Tipagem Segura (Type Safety):** Os métodos criados via Extensions alteram a tipagem do próprio cliente em tempo de execução. O VS Code reconhece os novos métodos imediatamente.
- **Modularidade:** É possível encadear múltiplas extensões (ex: uma extensão para logs, outra para segurança, outra para soft delete) sem poluir o arquivo de inicialização.

---

## 3. Implementação Técnica

Vamos estruturar uma extensão robusta focada em duas regras críticas:

1. **Soft Delete:** Evitar que dados de membros ou projetos sejam deletados fisicamente do banco de dados (mudando apenas uma flag `deletedAt`).
2. **Auditoria:** Atualizar automaticamente metadados de modificação.

### Passo 1: Atualização do Schema (`prisma/schema.prisma`)

As tabelas do sistema que necessitam dessas regras devem conter os campos de controle:

```prisma
model Project {
  id        String    @id @default(uuid())
  title     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // Campo essencial para o Soft Delete
}

```

### Passo 2: Configuração do Cliente Estendido (`src/infra/database.ts`)

Criamos a instância central do Prisma aplicando as extensões globais para interceptar as operações de exclusão e leitura.

```typescript
import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends({
  name: 'project-extensions',
  model: {
    $allModels: {
      // Cria um método utilitário customizado reconhecido pelo TypeScript
      async exists<T>(this: T, where: any): Promise<boolean> {
        const context = this as any;
        const count = await context.count({ where });
        return count > 0;
      },
    },
  },
  query: {
    $allModels: {
      // 1. INTERCEPTOR DE EXCLUSÃO (Soft Delete)
      async delete({ model, args, query }) {
        return (basePrisma as any)[model].update({
          ...args,
          data: { deletedAt: new Date() },
        });
      },
      async deleteMany({ model, args, query }) {
        return (basePrisma as any)[model].updateMany({
          ...args,
          data: { deletedAt: new Date() },
        });
      },

      // 2. INTERCEPTOR DE LEITURA (Filtrar excluídos por padrão)
      async findFirst({ args, query }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findMany({ args, query }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findUnique({ args, query }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
```

---

## 4. Integração com o Prisma Optimize

Para habilitar o monitoramento de performance do Prisma Optimize na nuvem ou no painel de controle do Prisma Data Platform, basta envelopar o cliente com a chave de telemetria fornecida pelo painel deles no arquivo de ambiente:

### No arquivo `.env.development`:

```env
# Ativa a ENGINE do Prisma Optimize para enviar telemetria de queries em tempo de execução
PRISMA_OPTIMIZE_TOKEN="opt_tkn_exemplo_pgi_proa_12345"

```

O próprio Prisma Client, ao detectar o token no ambiente, passa a analisar as instruções enviadas ao PostgreSQL, gerando insights automáticos na sua dashboard do Prisma.

---

## 5. Testes Automatizados de Integração (E2E)

Para garantir que a nossa extensão de Soft Delete não permita o vazamento de dados excluídos em listagens comuns, validamos o comportamento via testes automatizados.

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { prisma } from '../../src/infra/database';

describe('[Integration] Prisma Client Extensions - Soft Delete', () => {
  beforeEach(async () => {
    // Limpa o cenário de testes
    await (prisma as any).project.deleteMany({ where: {} });
  });

  it('deve marcar deletedAt em vez de apagar o registro fisicamente', async () => {
    const project = await (prisma as any).project.create({
      data: { title: 'Projeto de Auditoria PGI' },
    });

    // Dispara o delete interceptado pela extensão
    await (prisma as any).project.delete({
      where: { id: project.id },
    });

    // Validação 1: O findMany padrão NÃO deve achar o projeto (filtro automático)
    const activeProjects = await (prisma as any).project.findMany({});
    expect(activeProjects.length).toBe(0);

    // Validação 2: Fazendo o bypass manual usando a instância base para checar o banco físico
    const rawClient = new (prisma as any).constructor();
    const dbRecord = await rawClient.project.findFirst({
      where: { id: project.id },
    });

    expect(dbRecord).toBeDefined();
    expect(dbRecord?.deletedAt).toBeInstanceOf(Date); // A flag foi preenchida!
  });

  it('deve reconhecer dinamicamente o método customizado .exists()', async () => {
    await (prisma as any).project.create({
      data: { title: 'Verificação Existência' },
    });

    const isPresent = await (prisma as any).project.exists({
      title: 'Verificação Existência',
    });

    expect(isPresent).toBe(true);
  });
});
```
