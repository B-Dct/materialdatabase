-- Migration: Work Package Per-List Revisions
-- Goal: Replace global WP revisioning with granular list-level revisioning.

-- 1. Remove old global status and revision from project_work_packages (if they exist from a previous failed/partial migration)
-- Note: Doing this cautiously in case it was already applied.
ALTER TABLE IF EXISTS public.project_work_packages
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS revision;

-- 2. Add per-list status and revision columns
ALTER TABLE public.project_work_packages
    -- Material List
    ADD COLUMN IF NOT EXISTS material_list_status text NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS material_list_revision text NOT NULL DEFAULT 'A',
    -- Process List
    ADD COLUMN IF NOT EXISTS process_list_status text NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS process_list_revision text NOT NULL DEFAULT 'A',
    -- Standard Part List
    ADD COLUMN IF NOT EXISTS part_list_status text NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS part_list_revision text NOT NULL DEFAULT 'A',
    -- Layup List
    ADD COLUMN IF NOT EXISTS layup_list_status text NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS layup_list_revision text NOT NULL DEFAULT 'A',
    -- Assembly List
    ADD COLUMN IF NOT EXISTS assembly_list_status text NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS assembly_list_revision text NOT NULL DEFAULT 'A';

-- 3. Add Constraints for the new status columns
ALTER TABLE public.project_work_packages
    ADD CONSTRAINT valid_material_list_status CHECK (material_list_status IN ('open', 'closed')),
    ADD CONSTRAINT valid_process_list_status CHECK (process_list_status IN ('open', 'closed')),
    ADD CONSTRAINT valid_part_list_status CHECK (part_list_status IN ('open', 'closed')),
    ADD CONSTRAINT valid_layup_list_status CHECK (layup_list_status IN ('open', 'closed')),
    ADD CONSTRAINT valid_assembly_list_status CHECK (assembly_list_status IN ('open', 'closed'));

-- 4. Recreate/Update work_package_revisions table for granular tracking
-- We drop and recreate it because we are changing the core data shape during early development.
DROP TABLE IF EXISTS public.work_package_revisions CASCADE;

CREATE TABLE public.work_package_revisions (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    work_package_id uuid NOT NULL REFERENCES public.project_work_packages(id) ON DELETE CASCADE,
    list_type text NOT NULL, -- 'material', 'process', 'standardPart', 'layup', 'assembly'
    revision text NOT NULL,
    changelog text,
    snapshot jsonb NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now()
);

-- Primary Key
ALTER TABLE ONLY public.work_package_revisions
    ADD CONSTRAINT work_package_revisions_pkey PRIMARY KEY (id);

-- Constraints
ALTER TABLE public.work_package_revisions
    ADD CONSTRAINT valid_list_type CHECK (list_type IN ('material', 'process', 'standardPart', 'layup', 'assembly'));

-- RLS Policies
ALTER TABLE public.work_package_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.work_package_revisions
    AS PERMISSIVE FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.work_package_revisions
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (true);
