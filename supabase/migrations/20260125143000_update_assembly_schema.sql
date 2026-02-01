-- Migration to UPDATE 'assemblies' table
-- Run this in your Supabase SQL Editor

-- 1. Add process_ids (array of uuids)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS process_ids uuid[] DEFAULT '{}';

-- 2. Add properties (jsonb)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS properties jsonb DEFAULT '[]'::jsonb;

-- 3. Add assigned_profile_ids (array of uuids)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS assigned_profile_ids uuid[] DEFAULT '{}';

-- 4. Add allowables (jsonb)
ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS allowables jsonb DEFAULT '[]'::jsonb;

-- 5. Update assembly_components table if necessary
-- The 'component_type' column might have a check constraint. 
-- We need to ensure 'material' is allowed. Check current constraints or just add a comment.
-- If you have a specific CHECK constraint like "check_component_type", drop and recreate it.
-- Assuming text column for now based on previous knowledge, but let's be safe.

-- Verify assembly_components schema (Optional / Manual Step usually)
-- For now, we assume component_type is text. If it was an enum, we'd need to alter type.
