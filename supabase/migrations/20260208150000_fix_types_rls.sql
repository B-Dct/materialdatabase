-- Fix RLS for Material Types explicitly

alter table material_type_definitions enable row level security;

-- Drop existing generic policy
drop policy if exists "Public Access" on material_type_definitions;

-- Create explicit permissive policy
create policy "Enable All Access" on material_type_definitions for all using (true) with check (true);
