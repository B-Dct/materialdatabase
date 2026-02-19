-- Fix RLS on assembly_components to ensure data can be saved
-- It is possible that RLS is enabled but no policy exists for the anon/authenticated user

ALTER TABLE assembly_components ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts (or use DO block, but simpler to just create if not exists)
DROP POLICY IF EXISTS "Enable all access for all users" ON assembly_components;
DROP POLICY IF EXISTS "Public Access" ON assembly_components;

-- Create a permissive policy for development
CREATE POLICY "Public Access" ON assembly_components
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Also ensure assembly_components sequence/id issues are resolved if any
-- (This table usually uses UUID as PK or composite PK, assuming UUID or serial)
