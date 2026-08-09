/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `cellphone` on the `users` table. All the data in the column will be lost.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Garante que a extensão de geração de UUID está ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Deleta as colunas que você removeu do schema
ALTER TABLE "users" 
    DROP COLUMN "address",
    DROP COLUMN "birth_date",
    DROP COLUMN "cellphone";

-- 1. Cria colunas temporárias UUID para TUDO que era TEXT e agora é UUID
ALTER TABLE "users" ADD COLUMN "new_id" UUID DEFAULT uuid_generate_v4();
ALTER TABLE "refresh_tokens" ADD COLUMN "new_userId" UUID;
ALTER TABLE "refresh_tokens" ADD COLUMN "new_id" UUID DEFAULT uuid_generate_v4();

-- 2. Copia os novos UUIDs gerados para manter os vínculos
UPDATE "refresh_tokens" SET "new_userId" = "users"."new_id" FROM "users" WHERE "refresh_tokens"."userId" = "users"."id";

-- 3. Remove as restrições antigas
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_pkey";
ALTER TABLE "users" DROP CONSTRAINT "users_pkey" CASCADE;

-- 4. Apaga as colunas antigas de TEXT
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "refresh_tokens" DROP COLUMN "userId";
ALTER TABLE "refresh_tokens" DROP COLUMN "id";

-- 5. Renomeia as colunas novas para assumirem seus lugares
ALTER TABLE "users" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "refresh_tokens" RENAME COLUMN "new_userId" TO "userId";
ALTER TABLE "refresh_tokens" RENAME COLUMN "new_id" TO "id";

-- 6. Define as colunas como obrigatórias
ALTER TABLE "users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "id" SET NOT NULL;

-- 7. Recria as Chaves Primárias e Estrangeiras com os UUIDs novos
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'LOW',
    "project_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;