create table if not exists tasks (
  id text primary key,
  title text not null,
  subject text not null default '',
  priority text not null default 'low',
  done boolean not null default false,
  deadline text not null default '',
  deadline_time text,
  created_at bigint not null default 0,
  completed_at bigint
);

create table if not exists repo_files (
  id text primary key,
  name text not null,
  path text,
  subject text not null default '通用',
  mime_type text not null default '',
  size bigint not null default 0,
  created_at bigint not null default 0
);

alter table tasks enable row level security;
alter table repo_files enable row level security;

drop policy if exists "tasks allow all" on tasks;
create policy "tasks allow all" on tasks
  for all using (true) with check (true);

drop policy if exists "repo_files allow all" on repo_files;
create policy "repo_files allow all" on repo_files
  for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('repo-files', 'repo-files', true)
on conflict (id) do nothing;

drop policy if exists "repo-files read" on storage.objects;
create policy "repo-files read" on storage.objects
  for select using (bucket_id = 'repo-files');

drop policy if exists "repo-files insert" on storage.objects;
create policy "repo-files insert" on storage.objects
  for insert with check (bucket_id = 'repo-files');

drop policy if exists "repo-files update" on storage.objects;
create policy "repo-files update" on storage.objects
  for update using (bucket_id = 'repo-files') with check (bucket_id = 'repo-files');

drop policy if exists "repo-files delete" on storage.objects;
create policy "repo-files delete" on storage.objects
  for delete using (bucket_id = 'repo-files');
