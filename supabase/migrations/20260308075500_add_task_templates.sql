-- Add Task Templates Schema
CREATE TABLE IF NOT EXISTS test_task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    phase TEXT NOT NULL CHECK (phase IN ('specimen_preparation', 'testing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS test_task_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES test_task_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 8,
    depends_on_item_index INTEGER,
    dependency_offset_days INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Modify test_tasks
ALTER TABLE test_tasks ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN ('specimen_preparation', 'testing'));
ALTER TABLE test_tasks ADD COLUMN IF NOT EXISTS standard_duration_hours INTEGER;

-- RLS for templates (Disabled for local dev / unauthenticated use)
ALTER TABLE test_task_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_task_template_items DISABLE ROW LEVEL SECURITY;
