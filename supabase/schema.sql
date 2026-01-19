-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Materials Table
create table materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  manufacturer text not null,
  type text not null, -- Prepreg, Resin, etc.
  status text not null default 'standard', -- standard, blocked, in_review, obsolete
  properties jsonb default '[]'::jsonb, -- Specific properties (Name, Value, Unit, Spec)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Material Variants Table
create table material_variants (
  variant_id uuid primary key default uuid_generate_v4(),
  base_material_id uuid references materials(id) not null,
  variant_name text not null,
  properties jsonb not null default '{}'::jsonb, -- dynamic properties
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Layups Table (Immutable by design)
create table layups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  status text not null default 'in_review',
  process_params jsonb not null default '{}'::jsonb, -- e.g. cure cycle
  total_thickness numeric,
  total_weight numeric,
  
  -- Versioning
  version integer not null default 1,
  previous_version_id uuid references layups(id),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by text -- store user ID or name for now
);

-- Layup Layers (Join table)
create table layup_layers (
  id uuid primary key default uuid_generate_v4(),
  layup_id uuid references layups(id) not null,
  material_variant_id uuid references material_variants(variant_id) not null,
  orientation numeric not null, -- 0, 45, 90, etc.
  sequence integer not null -- Order 1, 2, 3...
);

-- Assemblies Table
create table assemblies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  status text not null default 'in_review',
  version integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Assembly Components
create table assembly_components (
  id uuid primary key default uuid_generate_v4(),
  assembly_id uuid references assemblies(id) not null,
  component_type text not null, -- layup, sub-assembly
  component_id uuid not null, -- Generic ID, application logic handles lookup
  quantity integer not null default 1
);

-- RLS Policies (Open availability for prototype, refine later)
alter table materials enable row level security;
create policy "Public Access" on materials for all using (true);

alter table material_variants enable row level security;
create policy "Public Access" on material_variants for all using (true);

alter table layups enable row level security;
create policy "Public Access" on layups for all using (true);

alter table layup_layers enable row level security;
create policy "Public Access" on layup_layers for all using (true);

alter table assemblies enable row level security;
create policy "Public Access" on assemblies for all using (true);

alter table assembly_components enable row level security;
create policy "Public Access" on assembly_components for all using (true);

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

-- Manufacturing Processes
create table manufacturing_processes (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    default_params jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update Layups
-- alter table layups add column process_id uuid references manufacturing_processes(id); 
-- (Commented out alter command as we likely re-run schema or migration in real app. For prototype, we assume schema.sql defines state)
-- Re-defining layups table (conceptually) would include process_id, but staying additive here for reference.

-- RLS
alter table measurements enable row level security;
create policy "Public Access" on measurements for all using (true);

alter table manufacturing_processes enable row level security;
create policy "Public Access" on manufacturing_processes for all using (true);
