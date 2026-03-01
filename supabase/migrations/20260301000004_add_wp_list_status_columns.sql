-- Add missing list status and revision columns to project_work_packages

ALTER TABLE project_work_packages 
ADD COLUMN IF NOT EXISTS material_list_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS material_list_revision text DEFAULT 'A',
ADD COLUMN IF NOT EXISTS process_list_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS process_list_revision text DEFAULT 'A',
ADD COLUMN IF NOT EXISTS part_list_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS part_list_revision text DEFAULT 'A',
ADD COLUMN IF NOT EXISTS layup_list_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS layup_list_revision text DEFAULT 'A',
ADD COLUMN IF NOT EXISTS assembly_list_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS assembly_list_revision text DEFAULT 'A';
