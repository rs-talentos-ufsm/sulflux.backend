-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRODUCER', 'INTERMEDIARY', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'PRODUCER';

-- AlterTable crop_cycles (se a tabela existir)
DO $$ BEGIN
    ALTER TABLE "crop_cycles" ADD COLUMN IF NOT EXISTS "sequencia" INTEGER NOT NULL DEFAULT 1;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- AlterTable field_inputs (se a tabela existir)
DO $$ BEGIN
    ALTER TABLE "field_inputs" ADD COLUMN IF NOT EXISTS "unit" TEXT NOT NULL DEFAULT 'kg/ha',
    ADD COLUMN IF NOT EXISTS "notes" TEXT;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;
