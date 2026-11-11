-- AlterTable
DO $$ BEGIN
    -- Converte a coluna quantity de text para double precision se ela for text
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'field_inputs' 
          AND column_name = 'quantity' 
          AND data_type = 'text'
    ) THEN
        ALTER TABLE "field_inputs" 
        ALTER COLUMN "quantity" TYPE DOUBLE PRECISION 
        USING (NULLIF(regexp_replace(quantity, '[^0-9.]', '', 'g'), '')::double precision);
    END IF;
END $$;
