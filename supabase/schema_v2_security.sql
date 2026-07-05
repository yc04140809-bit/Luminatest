-- ============================================================
-- 接遇ガードAI: 追加セキュリティ機能マイグレーション(v2)
-- 内容:組織(契約単位)によるケース共有の限定 / 通報 / 管理者削除 / アクセスログ
-- Supabase の SQL Editor に全文貼り付けて実行してください(初回実行のschema.sqlは実行済みが前提)。
-- ============================================================

-- ---------- ユーザー設定に「所属組織」「管理者フラグ」を追加 ----------
alter table user_settings add column if not exists org_id uuid;
alter table user_settings add column if not exists is_admin boolean not null default false;

-- ---------- 組織(契約単位)テーブル ----------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_org_id_fkey') then
    alter table user_settings add constraint user_settings_org_id_fkey foreign key (org_id) references organizations(id);
  end if;
end $$;

-- ---------- ヘルパー関数(RLSポリシーから使う。呼び出したユーザー自身の所属組織/管理者権限を返す) ----------
create or replace function current_org_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from user_settings where user_id = auth.uid();
$$;

create or replace function is_org_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from user_settings where user_id = auth.uid()), false);
$$;

alter table organizations enable row level security;
drop policy if exists "organizations_select_own" on organizations;
create policy "organizations_select_own" on organizations for select using (id = current_org_id());
-- 組織の作成・招待コードでの参加は、下記のsecurity definer関数からのみ行う(直接のinsert/updateは許可しない)

-- 新しい組織を作る(作成者が自動的にその組織の管理者になる)
create or replace function create_organization(p_name text, p_code text)
returns table(id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org organizations;
begin
  insert into organizations (name, invite_code) values (p_name, p_code)
  returning * into new_org;
  update user_settings set org_id = new_org.id, is_admin = true where user_id = auth.uid();
  return query select new_org.id, new_org.name, new_org.invite_code;
end;
$$;

-- 招待コードで既存の組織に参加する
create or replace function join_organization(p_code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target organizations;
begin
  select * into target from organizations where invite_code = p_code;
  if target.id is null then
    raise exception 'invalid invite code';
  end if;
  update user_settings set org_id = target.id, is_admin = false where user_id = auth.uid();
  return query select target.id, target.name;
end;
$$;

-- ---------- みんなのケース共有を「同じ組織内のみ」に限定 ----------
alter table shared_cases add column if not exists org_id uuid references organizations(id);
alter table shared_cases add column if not exists user_id uuid references auth.users(id);

drop policy if exists "shared_cases_select_all" on shared_cases;
drop policy if exists "shared_cases_insert_authenticated" on shared_cases;

create policy "shared_cases_select_org" on shared_cases for select using (org_id = current_org_id());
create policy "shared_cases_insert_org" on shared_cases for insert with check (org_id = current_org_id() and user_id = auth.uid());
create policy "shared_cases_delete_admin" on shared_cases for delete using (is_org_admin() and org_id = current_org_id());

-- ---------- 通報機能 ----------
create table if not exists case_reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references shared_cases(id) on delete cascade,
  org_id uuid not null references organizations(id),
  reporter_id uuid not null references auth.users(id),
  reason text,
  created_at timestamptz not null default now()
);
alter table case_reports enable row level security;
create policy "case_reports_insert_own" on case_reports for insert with check (reporter_id = auth.uid() and org_id = current_org_id());
create policy "case_reports_select_admin" on case_reports for select using (is_org_admin() and org_id = current_org_id());
create policy "case_reports_delete_admin" on case_reports for delete using (is_org_admin() and org_id = current_org_id());

-- ---------- アクセスログ(誰が・いつ・何をしたか) ----------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  org_id uuid references organizations(id),
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "audit_log_insert_own" on audit_log for insert with check (user_id = auth.uid());
create policy "audit_log_select_admin_or_own" on audit_log
  for select using (user_id = auth.uid() or (is_org_admin() and org_id = current_org_id()));
