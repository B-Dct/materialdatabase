-- Create Standard Parts Table if not exists (although user might have created it, safe to recreate or just update policies, but let's provide full script)
create table if not exists public.standard_parts (
  id uuid not null default gen_random_uuid (),
  name text not null,
  manufacturer text null,
  supplier text null,
  status text not null default 'standard'::text,
  created_at timestamp with time zone not null default now(),
  constraint standard_parts_pkey primary key (id)
) tablespace pg_default;

-- Enable RLS
alter table public.standard_parts enable row level security;

-- Drop existing policies if any to avoid conflicts
drop policy if exists "Enable read access for all users" on "public"."standard_parts";
drop policy if exists "Enable insert for authenticated users only" on "public"."standard_parts";
drop policy if exists "Enable update for authenticated users only" on "public"."standard_parts";
drop policy if exists "Enable delete for authenticated users only" on "public"."standard_parts";
drop policy if exists "Enable insert for all users" on "public"."standard_parts";
drop policy if exists "Enable update for all users" on "public"."standard_parts";
drop policy if exists "Enable delete for all users" on "public"."standard_parts";


-- Create permissive policies for prototype (Allow Anon/Public)

create policy "Enable read access for all users"
on "public"."standard_parts"
as PERMISSIVE
for SELECT
to public
using (
  true
);

create policy "Enable insert for all users"
on "public"."standard_parts"
as PERMISSIVE
for INSERT
to public
with check (
  true
);

create policy "Enable update for all users"
on "public"."standard_parts"
as PERMISSIVE
for UPDATE
to public
using (
  true
);

create policy "Enable delete for all users"
on "public"."standard_parts"
as PERMISSIVE
for DELETE
to public
using (
  true
);
