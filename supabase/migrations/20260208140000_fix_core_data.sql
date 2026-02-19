-- Fix Core Data Missing Tables and Columns

-- 1. Laboratories
create table if not exists laboratories (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for laboratories
alter table laboratories enable row level security;
drop policy if exists "Public Access" on laboratories;
create policy "Public Access" on laboratories for all using (true);

-- 2. Material Type Definitions
create table if not exists material_type_definitions (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for material_type_definitions
alter table material_type_definitions enable row level security;
drop policy if exists "Public Access" on material_type_definitions;
create policy "Public Access" on material_type_definitions for all using (true);

-- 3. Manufacturing Processes
create table if not exists manufacturing_processes (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    default_params jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    -- Add new columns directly here if creating fresh
    sub_process text,
    process_number text
);

-- Enable RLS
alter table manufacturing_processes enable row level security;
drop policy if exists "Public Access" on manufacturing_processes;
create policy "Public Access" on manufacturing_processes for all using (true);

-- If table already existed but columns missing (for some reason?), add them
alter table manufacturing_processes 
add column if not exists sub_process text,
add column if not exists process_number text;

-- 4. Seed Material Types if empty (optional but helpful)
-- Only insert if the table is empty to avoid duplicates on re-runs (though name is unique)
insert into material_type_definitions (name)
values 
  ('Prepreg'), 
  ('Fabric'), 
  ('Resin'), 
  ('Metal'), 
  ('Core'), 
  ('Adhesive'), 
  ('Consumable')
on conflict (name) do nothing;
