-- Deployment draft: inspect existing schema and take a full backup before applying.
-- Additive only. Auth accounts, passwords, existing marketplace data are not replaced.
begin;
create schema if not exists palanart_private;
revoke all on schema palanart_private from public, anon, authenticated;

create table if not exists public.palanart_auth_flows (
  token_hash text primary key check (length(token_hash) = 64),
  provider text not null check (provider in ('telegram', 'vk', 'max', 'yandex')),
  role text not null check (role in ('client', 'artist')),
  return_to text not null,
  link_user_id uuid references auth.users(id) on delete cascade,
  verifier text,
  browser_hash text,
  poll_secret_hash text,
  verified_profile jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists palanart_auth_flows_expiry on public.palanart_auth_flows(expires_at);
create index if not exists palanart_auth_flows_link_user on public.palanart_auth_flows(link_user_id);
alter table public.palanart_auth_flows enable row level security;
revoke all on public.palanart_auth_flows from public, anon, authenticated;
grant select, insert, update, delete on public.palanart_auth_flows to service_role;

create table if not exists public.palanart_external_identities (
  provider text not null check (provider in ('telegram', 'vk', 'max', 'yandex')),
  subject text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider, subject)
);
create index if not exists palanart_external_identities_user on public.palanart_external_identities(user_id);
alter table public.palanart_external_identities enable row level security;
revoke all on public.palanart_external_identities from public, anon, authenticated;
grant select, insert, update, delete on public.palanart_external_identities to service_role;

create table if not exists public.palanart_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'artist', 'admin')),
  full_name text not null default '',
  email text,
  phone text not null default '',
  city text not null default '',
  providers jsonb not null default '["email"]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.palanart_profiles enable row level security;
revoke all on public.palanart_profiles from public, anon, authenticated;
grant select on public.palanart_profiles to authenticated;
grant update(full_name, phone, city) on public.palanart_profiles to authenticated;
grant all on public.palanart_profiles to service_role;
drop policy if exists palanart_profile_read_own on public.palanart_profiles;
create policy palanart_profile_read_own on public.palanart_profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists palanart_profile_update_own on public.palanart_profiles;
create policy palanart_profile_update_own on public.palanart_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Privileged trigger is private, not an exposed RPC; no user-editable role claims.
create or replace function palanart_private.sync_auth_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_schema <> 'auth' or tg_table_name <> 'users' then raise exception 'Invalid trigger context'; end if;
  insert into public.palanart_profiles(id, full_name, email, phone, city, providers, created_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email, coalesce(new.raw_user_meta_data->>'phone', ''), coalesce(new.raw_user_meta_data->>'city', ''),
    coalesce(new.raw_app_meta_data->'providers', '["email"]'::jsonb), new.created_at)
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email,
    phone = excluded.phone, city = excluded.city, providers = excluded.providers, updated_at = now();
  return new;
end;
$$;
revoke all on function palanart_private.sync_auth_profile() from public, anon, authenticated;
drop trigger if exists palanart_sync_auth_profile on auth.users;
create trigger palanart_sync_auth_profile after insert or update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function palanart_private.sync_auth_profile();

insert into public.palanart_profiles(id, full_name, email, phone, city, providers, created_at)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), email,
  coalesce(raw_user_meta_data->>'phone', ''), coalesce(raw_user_meta_data->>'city', ''),
  coalesce(raw_app_meta_data->'providers', '["email"]'::jsonb), created_at from auth.users
on conflict (id) do nothing;

-- Preserve stable legacy social identities; never merge by an unverified email.
insert into public.palanart_external_identities(provider, subject, user_id)
select split_part(email, '_', 1), substring(split_part(email, '@', 1) from position('_' in email) + 1), id
from auth.users where email ~ '^(telegram|vk|max|yandex)_[A-Za-z0-9_-]+@auth\.(dvizhart|palanart)\.local$'
on conflict (provider, subject) do nothing;
commit;
