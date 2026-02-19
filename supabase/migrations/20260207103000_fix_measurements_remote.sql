-- Combined Fix for Remote Measurements Table
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Enable RLS and Policies
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access" ON measurements;
CREATE POLICY "Allow authenticated read access" ON measurements
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access" ON measurements;
CREATE POLICY "Allow authenticated full access" ON measurements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Add Missing Columns (Backwards Compatible)
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS layup_id uuid REFERENCES layups(id),
ADD COLUMN IF NOT EXISTS assembly_id uuid REFERENCES assemblies(id);

-- 3. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_measurements_layup_id ON measurements(layup_id);
CREATE INDEX IF NOT EXISTS idx_measurements_assembly_id ON measurements(assembly_id);
