import { prisma } from './src/infra/database';
import { beforeEach } from 'vitest';

interface TableResult {
  tablename: string;
}

async function resetDatabase() {
  try {
    // Busca todas as tabelas do schema public
    const tablenames = await prisma.$queryRaw<TableResult[]>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public'
    `;

    // Se o banco não tiver tabelas ainda, mata a execução cedo
    if (!tablenames || tablenames.length === 0) return;

    // Filtra migrations e formata para SQL seguro
    const tables = tablenames
      .map((row) => row.tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    // Se houver tabelas, limpa todas com TRUNCATE CASCADE
    if (tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch (error) {
    console.error('❌ Erro ao limpar banco de testes:', error);
  }
}

beforeEach(async () => {
  await resetDatabase();
});
