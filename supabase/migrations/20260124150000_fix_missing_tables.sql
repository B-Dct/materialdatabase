-- Create measurements table if it doesn't exist
create table if not exists measurements (
  id uuid primary key default uuid_generate_v4(),
  material_id uuid references materials(id) on delete set null,
  property_definition_id text not null,
  value numeric not null,
  unit text,
  laboratory_id text,
  reliability text check (reliability in ('allowable', 'engineering', 'feasibility')),
  value_type text check (value_type in ('single', 'mean', 'min', 'max')),
  test_method text,
  process_params jsonb default '{}'::jsonb,
  date date not null,
  source_type text check (source_type in ('manual', 'import', 'pdf')),
  source_file_url text,
  source_filename text,
  created_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table measurements enable row level security;
create policy "Public Access" on measurements for all using (true);

-- Create allowables table if it doesn't exist (for future use)
create table if not exists allowables (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null,
  parent_type text check (parent_type in ('material', 'layup')),
  property_definition_id text not null,
  basis text check (basis in ('A', 'B', 'Mean')),
  value numeric not null,
  unit text,
  condition text, -- e.g. "RTD" (Room Temp Dry), "ETW"
  statistical_params jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table allowables enable row level security;
create policy "Public Access" on allowables for all using (true);
