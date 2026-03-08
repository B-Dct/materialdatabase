-- Create lab_technicians table
CREATE TABLE IF NOT EXISTS lab_technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In a real app we might update the enum test_request_status here, but 
-- Supabase handles enums slightly differently and sometimes it's easier to use TEXT with checks.
-- We will assume the status in the frontend is just expanded, but to be safe if it's an enum:
-- ALTER TYPE test_request_status ADD VALUE IF NOT EXISTS 'specimen_preparation';
-- Let's just alter the check constraint if it is a text field, or just leave it if it's open.
-- (Inspecting typical setups, we defined it as text in TS, and likely text in DB or open enum).

-- Create test_tasks table
CREATE TABLE IF NOT EXISTS test_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_request_id UUID NOT NULL REFERENCES test_requests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_hours NUMERIC DEFAULT 0,
    start_date DATE,
    target_date DATE,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'canceled')),
    assignee_id UUID REFERENCES lab_technicians(id) ON DELETE SET NULL,
    depends_on_task_id UUID REFERENCES test_tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for updated_at on test_tasks
CREATE OR REPLACE FUNCTION update_test_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_test_tasks_updated_at ON test_tasks;
CREATE TRIGGER trg_test_tasks_updated_at
    BEFORE UPDATE ON test_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_test_tasks_updated_at();

-- RLS for lab_technicians
ALTER TABLE lab_technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to lab_technicians" ON lab_technicians
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS for test_tasks
ALTER TABLE test_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to test_tasks" ON test_tasks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Adding an assignee to test_requests directly for overall ownership
ALTER TABLE test_requests ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES lab_technicians(id) ON DELETE SET NULL;
ALTER TABLE test_requests ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE test_requests ADD COLUMN IF NOT EXISTS start_date DATE;

-- Update the realtime publication if necessary
ALTER PUBLICATION supabase_realtime ADD TABLE lab_technicians;
ALTER PUBLICATION supabase_realtime ADD TABLE test_tasks;

