ALTER TABLE assembly_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON assembly_components;
DROP POLICY IF EXISTS "Enable all access for all users" ON assembly_components;

CREATE POLICY "Public Access" ON assembly_components
FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE assembly_components DROP CONSTRAINT IF EXISTS assembly_components_component_type_check;

ALTER TABLE assembly_components ADD CONSTRAINT assembly_components_component_type_check 
CHECK (component_type IN ('layup', 'material', 'standard_part'));

ALTER TABLE assembly_components DROP CONSTRAINT IF EXISTS assembly_components_component_id_fkey;

ALTER TABLE assembly_components ADD COLUMN IF NOT EXISTS config jsonb;
ALTER TABLE assembly_components ADD COLUMN IF NOT EXISTS position integer;

CREATE INDEX IF NOT EXISTS idx_assembly_components_assembly_id ON assembly_components(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_components_component_id ON assembly_components(component_id);
