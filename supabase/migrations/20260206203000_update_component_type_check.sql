-- Migration to allow 'standard_part' in component_type
-- Safe to run even if no constraint exists

DO $$
BEGIN
    -- Check if a constraint named 'assembly_components_component_type_check' exists (standard naming)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assembly_components_component_type_check') THEN
        ALTER TABLE assembly_components DROP CONSTRAINT assembly_components_component_type_check;
    END IF;
END $$;

-- Re-add constraint with new value (or you can leave it without constraint if preferred, but constraint is good)
-- If the column is TEXT, this adds validity.
ALTER TABLE assembly_components ADD CONSTRAINT assembly_components_component_type_check 
CHECK (component_type IN ('layup', 'material', 'standard_part'));
