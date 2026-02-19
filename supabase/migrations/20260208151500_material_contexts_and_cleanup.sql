-- Add assignment arrays to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS assigned_reference_layup_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_reference_assembly_ids UUID[] DEFAULT '{}';

-- Remove the is_reference flag from layups as requested (cleanup)
ALTER TABLE layups DROP COLUMN IF EXISTS is_reference;

-- Ensure assemblies have is_reference? User said "Assign Reference Assemblies".
-- Similar to Layups, maybe we don't need a flag if the assignment *makes* it a reference.
-- "Control everything via the Material".
-- So I will NOT add is_reference to assemblies, consistent with Layup cleanup.
