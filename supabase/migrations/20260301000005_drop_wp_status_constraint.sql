-- Drop status constraint to prevent creation blocking

ALTER TABLE project_work_packages 
DROP CONSTRAINT IF EXISTS project_work_packages_status_check;
