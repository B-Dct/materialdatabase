-- Add entry_status column to support archiving
-- Values: 'active' (default), 'archived'

-- Laboratories
alter table laboratories
add column if not exists entry_status text default 'active';

-- Manufacturing Processes
alter table manufacturing_processes
add column if not exists entry_status text default 'active';

-- Material Types
alter table material_type_definitions
add column if not exists entry_status text default 'active';
