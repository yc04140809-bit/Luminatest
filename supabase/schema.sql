-- ============================================================
-- 接遇ガードAI: Supabase スキーマ
-- Supabase ダッシュボードの「SQL Editor」に全文貼り付けて実行してください。
-- ============================================================

-- 対応記録(1ユーザーが複数件持つ・自分のものだけ読み書き可能)
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  situation text,
  place text,
  person text,
  staff text,
  content text not null,
  result text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table records enable row level security;
create policy "records_select_own" on records for select using (auth.uid() = user_id);
create policy "records_insert_own" on records for insert with check (auth.uid() = user_id);
create policy "records_update_own" on records for update using (auth.uid() = user_id);
create policy "records_delete_own" on records for delete using (auth.uid() = user_id);

-- 研修スコア履歴
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  scenario text,
  level text,
  score int not null,
  created_at timestamptz not null default now()
);
alter table scores enable row level security;
create policy "scores_select_own" on scores for select using (auth.uid() = user_id);
create policy "scores_insert_own" on scores for insert with check (auth.uid() = user_id);

-- ユーザー設定(1ユーザー1行:名前・業種・緊急連絡先・デイリーチャレンジ状態など)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_name text default '',
  industry text default 'general',
  sos_name text default '',
  sos_phone text default '',
  onboarded boolean default false,
  daily jsonb default '{"streak":0,"lastAnsweredDate":"","quizDate":"","quiz":null,"answered":null}',
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
create policy "user_settings_select_own" on user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on user_settings for update using (auth.uid() = user_id);

-- みんなのケース共有(全利用者に共通・投稿=追記のみ、匿名)
create table if not exists shared_cases (
  id uuid primary key default gen_random_uuid(),
  industry text,
  situation text not null,
  summary text not null,
  response text,
  result text,
  by text default '匿名',
  created_at timestamptz not null default now()
);
alter table shared_cases enable row level security;
create policy "shared_cases_select_all" on shared_cases for select using (true);
create policy "shared_cases_insert_authenticated" on shared_cases for insert with check (auth.role() = 'authenticated');

-- 月間AI利用回数(コスト保護用・サーバー側のみが読み書き。クライアントは直接触れない)
create table if not exists api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  count int not null default 0,
  primary key (user_id, month)
);
alter table api_usage enable row level security;
create policy "api_usage_select_own" on api_usage for select using (auth.uid() = user_id);
-- insert/updateのポリシーは作らない → サーバレス関数のservice roleキーのみが書き込み可能(RLSをバイパスする)

-- 呼び出し成功のたびに1増やす(サーバレス関数から呼び出す。原子的なupsert)
create or replace function increment_ai_usage(p_user_id uuid, p_month text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into api_usage (user_id, month, count)
  values (p_user_id, p_month, 1)
  on conflict (user_id, month)
  do update set count = api_usage.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
