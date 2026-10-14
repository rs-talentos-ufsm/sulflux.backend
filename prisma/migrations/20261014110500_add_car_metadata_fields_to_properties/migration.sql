-- AlterTable
ALTER TABLE "properties" ADD COLUMN "area" DOUBLE PRECISION,
ADD COLUMN "fiscal_modules" DOUBLE PRECISION,
ADD COLUMN "owner_name" TEXT,
ADD COLUMN "coordinates" JSONB;
