
-- Manufacturing Processes
create table manufacturing_processes (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    default_params jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table manufacturing_processes enable row level security;
create policy "Public Access" on manufacturing_processes for all using (true);

-- Add process link to layups
alter table layups add column process_id uuid references manufacturing_processes(id);
