-- Migration to add total_weight and total_thickness to assemblies
-- And FIX potential foreign key issues on assembly_components

-- 1. Add new columns to assemblies
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS total_weight numeric;
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS total_thickness numeric;

-- 2. FIX Foreign Key on assembly_components.component_id
-- We suspect there might be a FK to layups or materials that prevents inserting standard_parts.
-- A polymorphic relationship (layup OR material OR standard_part) cannot have a simple FK constraint.
-- We will DROP any existing FK constraint on component_id.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop ANY foreign key constraint on component_id column in assembly_components table
    FOR r IN (
        SELECT conname
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.contype = 'f' 
          AND con.conrelid = 'assembly_components'::regclass
          AND att.attname = 'component_id'
    ) LOOP
        EXECUTE 'ALTER TABLE assembly_components DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;
