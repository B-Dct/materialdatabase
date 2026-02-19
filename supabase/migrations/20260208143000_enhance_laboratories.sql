-- Enhance Laboratories Table to match Domain Model

alter table laboratories
add column if not exists city text,
add column if not exists country text,
add column if not exists authorized_methods text[] default '{}';

-- Add description if it was missing (my previous migration added it but just in case)
alter table laboratories
add column if not exists description text;
