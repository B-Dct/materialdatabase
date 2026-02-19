-- Enable RLS
ALTER TABLE layups ENABLE ROW LEVEL SECURITY;
ALTER TABLE layup_layers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Enable All Layups" ON layups;
DROP POLICY IF EXISTS "Public Access" ON layups;
DROP POLICY IF EXISTS "Authenticated Access" ON layups;
DROP POLICY IF EXISTS "Enable All Layup Layers" ON layup_layers;
DROP POLICY IF EXISTS "Public Access" ON layup_layers;

-- Create Permissive Policies
CREATE POLICY "Enable All Layups"
ON layups FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable All Layup Layers"
ON layup_layers FOR ALL
USING (true)
WITH CHECK (true);
