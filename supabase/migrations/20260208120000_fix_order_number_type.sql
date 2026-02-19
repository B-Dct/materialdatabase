-- Change order_number and reference_number to TEXT to allow alphanumeric values
-- and ensure they exist if they don't.

DO $$
BEGIN
    -- Handle order_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'measurements' AND column_name = 'order_number') THEN
        ALTER TABLE measurements ALTER COLUMN order_number TYPE text;
    ELSE
        ALTER TABLE measurements ADD COLUMN order_number text;
    END IF;

    -- Handle reference_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'measurements' AND column_name = 'reference_number') THEN
        ALTER TABLE measurements ALTER COLUMN reference_number TYPE text;
    ELSE
        ALTER TABLE measurements ADD COLUMN reference_number text;
    END IF;
END $$;
