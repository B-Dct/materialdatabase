
-- Measurements Table (Global Repository)
create table measurements (
  id uuid primary key default uuid_generate_v4(),
  material_id uuid references materials(id), -- Can be null initially if unlinked
  property_definition_id text not null, -- ID from code/store for now
  value numeric not null,
  unit text,
  laboratory_id text, -- ID from code/store
  
  -- Metadata
  reliability text check (reliability in ('allowable', 'engineering', 'feasibility')),
  value_type text check (value_type in ('single', 'mean', 'min', 'max')),
  test_method text,
  
  -- JSON Bags for flexibility
  process_params jsonb default '{}'::jsonb,
  
  -- Sourcing
  date date not null,
  source_type text check (source_type in ('manual', 'import', 'pdf')),
  source_file_url text, -- If PDF uploaded
  source_filename text,
  created_by text,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table measurements enable row level security;
create policy "Public Access" on measurements for all using (true);
