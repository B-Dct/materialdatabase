DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'materials'
        AND column_name = 'properties'
    ) THEN
        ALTER TABLE materials ADD COLUMN properties JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
