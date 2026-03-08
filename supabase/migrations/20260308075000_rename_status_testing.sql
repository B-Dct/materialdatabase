-- Migration to rename 'in_progress' to 'testing'
UPDATE test_requests SET status = 'testing' WHERE status = 'in_progress';
UPDATE test_tasks SET status = 'testing' WHERE status = 'in_progress';
