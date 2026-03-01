-- Create Work Packages table
create table project_work_packages (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid references projects(id) on delete cascade not null,
    name text not null,
    description text,
    status text default 'planned' check (status in ('planned', 'active', 'completed')),
    assigned_materials jsonb default '[]'::jsonb not null,
    assigned_processes jsonb default '[]'::jsonb not null,
    assigned_standard_parts jsonb default '[]'::jsonb not null,
    assigned_layups jsonb default '[]'::jsonb not null,
    assigned_assemblies jsonb default '[]'::jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table project_work_packages enable row level security;
create policy "Public Access" on project_work_packages for all using (true);
