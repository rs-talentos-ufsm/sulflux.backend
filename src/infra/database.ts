import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Configuração da Connection String baseada no ambiente
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Configura o Pool do Postgres (Driver Nativo)
const pool = new Pool({
  connectionString,
  // Ajusta o número máximo de conexões conforme o ambiente
  max: process.env.NODE_ENV === 'production' ? 10 : 5,
});

// Cria o adaptador do Prisma para usar o driver JS
const adapter = new PrismaPg(pool);

// Singleton para evitar múltiplas instâncias no hot-reload (Dev)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // Injeção do adaptador moderno
    log:
      process.env.NODE_ENV === 'test'
        ? ['error', 'warn']
        : process.env.NODE_ENV === 'development'
          ? ['query', 'error']
          : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

// Aplica as extensões na instância base
export const prisma = basePrisma.$extends({
  name: 'extensions',
  model: {
    $allModels: {
      // Método utilitário .exists() totalmente tipado
      async exists<T>(this: T, where: any): Promise<boolean> {
        const context = this as any;
        const count = await context.count({ where });
        return count > 0;
      },
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
