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

-- 1.1 v0.8 新增列：任务分类（daily=每日固定 / homework=作业）+ 附件（jsonb 数组）
alter table tasks add column if not exists type text not null default 'homework';
alter table tasks add column if not exists attachments jsonb not null default '[]';

-- 1.2 v0.8 打卡/完成记录表：做与没做都记录，没做可写反思原因
create table if not exists checkins (
  id text primary key,
  task_id text not null,
  /** 记录日期 YYYY-MM-DD（每日任务=当天；作业任务=截止日） */
  date text not null,
  /** done=已完成 / missed=没做 */
  status text not null,
  /** 反思原因（没做）/ 完成情况备注（完成） */
  reason text,
  /** 完成用时（分钟，用户自填） */
  duration int,
  created_at bigint not null default 0,
  unique (task_id, date)
);

-- v0.8 迭代：打卡记录增加用户自填的用时（分钟）
alter table checkins add column if not exists duration int;

-- 1.3 v0.10 计划表：每日详细计划 + 长期计划
create table if not exists plans (
  id text primary key,
  /** daily=某日计划条目 / longterm=长期计划 */
  type text not null default 'daily',
  /** daily 用：计划日期 YYYY-MM-DD；可选时段 HH:mm */
  date text,
  time text,
  /** longterm 用：计划标题 */
  title text,
  /** daily=计划内容 / longterm=详细内容 */
  content text not null default '',
  /** longterm 用：起止日期 */
  start_date text,
  end_date text,
  /** daily=完成勾选 / longterm=已达成 */
  done boolean not null default false,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

-- 1.4 v1.2 每日记录与反思表：与每日计划按日期绑定，一天一条
create table if not exists day_notes (
  id text primary key,
  /** 记录日期 YYYY-MM-DD，唯一（一天一条） */
  date text not null unique,
  /** 当日记录：实际做了什么、值得记住的事 */
  record text not null default '',
  /** 今日反思：哪里做得好、哪里可以改进 */
  reflection text not null default '',
  updated_at bigint not null default 0
);

-- 1.5 v1.4 新增列：今日描述（制定计划时写的计划日志）+ 长期计划反思与达成时间
alter table day_notes add column if not exists plan_note text;
alter table plans add column if not exists reflection text;
alter table plans add column if not exists completed_at bigint;

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
alter table checkins enable row level security;
alter table plans enable row level security;
alter table day_notes enable row level security;

drop policy if exists "tasks allow all" on tasks;
create policy "tasks allow all" on tasks
  for all using (true) with check (true);

drop policy if exists "repo_files allow all" on repo_files;
create policy "repo_files allow all" on repo_files
  for all using (true) with check (true);

drop policy if exists "checkins allow all" on checkins;
create policy "checkins allow all" on checkins
  for all using (true) with check (true);

drop policy if exists "plans allow all" on plans;
create policy "plans allow all" on plans
  for all using (true) with check (true);

drop policy if exists "day_notes allow all" on day_notes;
create policy "day_notes allow all" on day_notes
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
