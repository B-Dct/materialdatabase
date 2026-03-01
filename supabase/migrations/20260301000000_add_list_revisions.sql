-- Update work_package_revisions to support per-list tracking
ALTER TABLE public.work_package_revisions ADD COLUMN list_type text;
