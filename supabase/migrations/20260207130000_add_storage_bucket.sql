-- Create a new bucket 'documents' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Set up RLS for the bucket to allow public read but authenticated write
-- Enable RLS on objects if not already enabled (it usually is by default in storage schema)
-- alter table storage.objects enable row level security;


create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'documents' );

create policy "Authenticated Upload"
on storage.objects for insert
with check ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

create policy "Authenticated Update"
on storage.objects for update
using ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

create policy "Authenticated Delete"
on storage.objects for delete
using ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
