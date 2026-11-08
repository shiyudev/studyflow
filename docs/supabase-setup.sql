-- StudyFlow v0.7 后端建表脚本
-- 用法：Supabase 控制台 → SQL Editor → 粘贴本文件全部内容 → Run
-- 说明：黑客松单用户场景，未接登录系统，故策略对 anon 完全放开；
--       若未来加用户体系，需改为按 auth.uid() 隔离。

-- 1. 任务表
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

-- 2. 学习仓库文件元数据表（文件内容存 Storage）
create table if not exists repo_files (
  id text primary key,
  name text not null,
  path text,
  subject text not null default '通用',
  mime_type text not null default '',
  size bigint not null default 0,
  created_at bigint not null default 0
);

-- 3. 放开 anon 访问（配合 Row Level Security）
alter table tasks enable row level security;
alter table repo_files enable row level security;

drop policy if exists "tasks allow all" on tasks;
create policy "tasks allow all" on tasks
  for all using (true) with check (true);

drop policy if exists "repo_files allow all" on repo_files;
create policy "repo_files allow all" on repo_files
  for all using (true) with check (true);

-- 4. 文件存储桶（公开读，anon 可写/删）
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
