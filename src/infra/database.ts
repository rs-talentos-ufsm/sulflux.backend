import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Garante carregamento das variáveis de ambiente
if (!process.env.DATABASE_URL) {
  const isProd = process.env.NODE_ENV === 'production';
  const envFile = isProd
    ? fs.existsSync(path.resolve(process.cwd(), '.env.production'))
      ? '.env.production'
      : '.env'
    : fs.existsSync(path.resolve(process.cwd(), '.env.development'))
      ? '.env.development'
      : '.env';
  dotenv.config({ path: envFile });
  dotenv.config();
}

// Configuração da Connection String baseada no ambiente
const connectionString =
  process.env.DATABASE_URL ||
  (process.env.DB_USER && process.env.DB_HOST && process.env.DB_NAME
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5434}/${process.env.DB_NAME}?schema=public`
    : 'postgresql://user:UmaSenhaSuperSegura123@localhost:5434/db?schema=public');

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

export async function ensureDatabaseSchema(): Promise<void> {
  try {
    await (prisma as any).$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRODUCER', 'INTERMEDIARY', 'VIEWER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'PRODUCER';
      EXCEPTION
        WHEN undefined_table THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "crop_cycles" ADD COLUMN IF NOT EXISTS "sequencia" INTEGER NOT NULL DEFAULT 1;
      EXCEPTION
        WHEN undefined_table THEN null;
      END $$;

      DO $$ BEGIN
        ALTER TABLE "field_inputs" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'kg/ha';
        ALTER TABLE "field_inputs" ADD COLUMN IF NOT EXISTS "notes" TEXT;
      EXCEPTION
        WHEN undefined_table THEN null;
      END $$;
    `);
    console.log(
      '✅ Verificação de integridade do schema concluída com sucesso.',
    );
  } catch (err: any) {
    console.warn('⚠️ Nota sobre verificação do schema:', err?.message || err);
  }
}
