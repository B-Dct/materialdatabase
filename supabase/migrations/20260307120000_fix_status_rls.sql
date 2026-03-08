-- 1. Update the status check constraint to include 'specimen_preparation'
ALTER TABLE test_requests DROP CONSTRAINT IF EXISTS test_requests_status_check;
ALTER TABLE test_requests ADD CONSTRAINT test_requests_status_check 
    CHECK (status IN ('requested', 'specimen_preparation', 'in_progress', 'completed', 'canceled'));

-- 2. Due to the frontend using the anon key for some operations depending on auth state, 
-- we will drop RLS on the new tables or allow anon to ensure full functionality in this prototype.
ALTER TABLE lab_technicians DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_tasks DISABLE ROW LEVEL SECURITY;
