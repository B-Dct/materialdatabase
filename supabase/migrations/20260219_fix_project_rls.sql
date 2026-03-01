-- Remove the restricted policies that enforce authenticated sessions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON project_material_lists;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON project_process_lists;

-- Enable public/anonymous access for development since the app uses mock auth
CREATE POLICY "Enable dev access" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable dev access" ON project_material_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable dev access" ON project_process_lists FOR ALL USING (true) WITH CHECK (true);
