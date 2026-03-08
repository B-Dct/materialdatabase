-- 1. Create production_sites table
create table if not exists production_sites (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  description text,
  entry_status text check (entry_status in ('active', 'archived')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and add basic policy
alter table production_sites enable row level security;
create policy "Public Access on production_sites" on production_sites for all using (true);

-- Insert some default values (optional but good for a start)
insert into production_sites (name, description) values 
('Site A', 'Main Manufacturing Plant'),
('Site B', 'Secondary Facility')
on conflict do nothing;

-- 2. Add new columns to layups
alter table layups 
  add column if not exists process_number text,
  add column if not exists reference text,
  add column if not exists initiating_project_id uuid references projects(id) on delete set null,
  add column if not exists production_site_id uuid references production_sites(id) on delete set null;

-- 3. Add new columns to assemblies
alter table assemblies 
  add column if not exists process_number text,
  add column if not exists reference text,
  add column if not exists initiating_project_id uuid references projects(id) on delete set null,
  add column if not exists production_site_id uuid references production_sites(id) on delete set null;
