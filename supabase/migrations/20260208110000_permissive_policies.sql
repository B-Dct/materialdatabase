-- FORCE PUBLIC ACCESS for debugging
-- Measurements Table
alter table measurements enable row level security;
drop policy if exists "Public Access" on measurements;
drop policy if exists "Enable All" on measurements;

create policy "Enable All Measurements"
on measurements for all
using (true)
with check (true);

-- Storage Objects
-- Note: Supabase storage schema is usually 'storage'
drop policy if exists "Public Upload" on storage.objects;
drop policy if exists "Public Update" on storage.objects;
drop policy if exists "Public Delete" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Update" on storage.objects;
drop policy if exists "Authenticated Delete" on storage.objects;
drop policy if exists "Public Access" on storage.objects;

create policy "Enable All Storage"
on storage.objects for all
using (true)
with check (true);

-- Storage Buckets (Just in case)
drop policy if exists "Public Buckets" on storage.buckets;
create policy "Enable All Buckets"
on storage.buckets for all
using (true)
with check (true);
