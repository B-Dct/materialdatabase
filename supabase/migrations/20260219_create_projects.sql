-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'On Hold', 'Completed', 'Archived'
    revision TEXT DEFAULT '1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Material Lists (linked to Project)
CREATE TABLE IF NOT EXISTS project_material_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    revision TEXT NOT NULL DEFAULT '1',
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'frozen', 'obsolete'
    items JSONB DEFAULT '[]'::jsonb, -- Array of { materialId, variantId, quantity, notes, ...snapshotData }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Process Lists (linked to Project)
CREATE TABLE IF NOT EXISTS project_process_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    revision TEXT NOT NULL DEFAULT '1',
    status TEXT NOT NULL DEFAULT 'draft',
    items JSONB DEFAULT '[]'::jsonb, -- Array of { processId, notes, ...snapshotData }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- RLS Policies (Simple for now, matching existing pattern)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_material_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_process_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON project_material_lists FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON project_process_lists FOR ALL USING (auth.role() = 'authenticated');
