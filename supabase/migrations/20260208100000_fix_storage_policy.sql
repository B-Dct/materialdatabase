-- Allow public uploads to 'documents' bucket to match the public nature of 'measurements' table
-- (Assuming the app is currently intended for internal use without strict auth enforcement)

drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Update" on storage.objects;
drop policy if exists "Authenticated Delete" on storage.objects;

create policy "Public Upload"
on storage.objects for insert
with check ( bucket_id = 'documents' );

create policy "Public Update"
on storage.objects for update
using ( bucket_id = 'documents' );

create policy "Public Delete"
on storage.objects for delete
using ( bucket_id = 'documents' );
