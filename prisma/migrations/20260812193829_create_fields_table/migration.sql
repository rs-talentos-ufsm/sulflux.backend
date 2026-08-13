-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('READY', 'PROCESSING', 'WAITING');

-- CreateTable
CREATE TABLE "fields" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "soil_type" TEXT,
    "area" DOUBLE PRECISION,
    "perimeter" DOUBLE PRECISION,
    "coordinates" JSONB,
    "status" "FieldStatus" NOT NULL DEFAULT 'WAITING',
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fields_property_id_idx" ON "fields"("property_id");

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
