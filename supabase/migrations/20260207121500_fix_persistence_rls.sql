-- Fix Persistence Issues

-- 1. Ensure assemblies has assigned_profile_ids (In case previous migration wasn't run)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS assigned_profile_ids uuid[] DEFAULT '{}';

-- 2. Fix RLS for layups
ALTER TABLE layups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for layups" ON layups;
CREATE POLICY "Enable all access for layups" ON layups FOR ALL USING (true) WITH CHECK (true);

-- 3. Fix RLS for assemblies
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for assemblies" ON assemblies;
CREATE POLICY "Enable all access for assemblies" ON assemblies FOR ALL USING (true) WITH CHECK (true);

-- 4. Fix RLS for material_specifications
-- Ensure table exists (it should, but just in case of weird state)
CREATE TABLE IF NOT EXISTS material_specifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id uuid, -- FKs should be here but we skip specific constraints if table exists
    layup_id uuid,
    assembly_id uuid,
    name text NOT NULL,
    code text,
    description text,
    revision text,
    status text,
    valid_from timestamptz,
    document_url text,
    created_at timestamptz DEFAULT now()
);

-- Add columns if they are missing (for layups/assemblies support)
ALTER TABLE material_specifications ADD COLUMN IF NOT EXISTS layup_id uuid;
ALTER TABLE material_specifications ADD COLUMN IF NOT EXISTS assembly_id uuid;

ALTER TABLE material_specifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for specifications" ON material_specifications;
CREATE POLICY "Enable all access for specifications" ON material_specifications FOR ALL USING (true) WITH CHECK (true);
