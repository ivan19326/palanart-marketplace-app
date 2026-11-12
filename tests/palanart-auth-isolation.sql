-- Database integration test, not an email/OAuth login test.
-- All fixture rows and changes are rolled back; existing data is preserved.
begin;
select set_config('palanart.test_user_one', gen_random_uuid()::text, true);
select set_config('palanart.test_user_two', gen_random_uuid()::text, true);
insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  (current_setting('palanart.test_user_one')::uuid,
   'palanart-rls-' || current_setting('palanart.test_user_one') || '@example.invalid',
   '{"full_name":"Database fixture one","phone":"+79990000001","city":"Kazan","role":"admin"}',
   '{"provider":"email","providers":["email"]}', now(), now()),
  (current_setting('palanart.test_user_two')::uuid,
   'palanart-rls-' || current_setting('palanart.test_user_two') || '@example.invalid',
   '{"full_name":"Database fixture two","phone":"+79990000002","city":"Moscow"}',
   '{"provider":"email","providers":["email"]}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('palanart.test_user_one'), true);
do $$
declare affected integer;
begin
  if (select count(*) from public.palanart_profiles) <> 1 then
    raise exception 'Profile isolation failed';
  end if;
  if not exists (select 1 from public.palanart_profiles
    where id = (select auth.uid()) and role = 'client'
      and full_name = 'Database fixture one' and city = 'Kazan' and providers = '["email"]'::jsonb) then
    raise exception 'Profile trigger or role protection failed';
  end if;
  update public.palanart_profiles set city = 'Samara' where id = (select auth.uid());
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Own profile update failed'; end if;
  update public.palanart_profiles set city = 'Forbidden' where id = current_setting('palanart.test_user_two')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Other profile update was allowed'; end if;
  if has_column_privilege(current_user, 'public.palanart_profiles', 'role', 'UPDATE')
    or has_column_privilege(current_user, 'public.palanart_profiles', 'id', 'UPDATE')
    or has_column_privilege(current_user, 'public.palanart_profiles', 'providers', 'UPDATE')
    or has_table_privilege(current_user, 'public.palanart_auth_flows', 'SELECT')
    or has_table_privilege(current_user, 'public.palanart_external_identities', 'SELECT')
    or has_schema_privilege(current_user, 'palanart_private', 'USAGE') then
    raise exception 'Sensitive data or privileged columns are exposed';
  end if;
end;
$$;

set local role anon;
do $$
begin
  if has_table_privilege(current_user, 'public.palanart_profiles', 'SELECT')
    or has_table_privilege(current_user, 'public.palanart_profiles', 'INSERT')
    or has_table_privilege(current_user, 'public.palanart_auth_flows', 'SELECT')
    or has_table_privilege(current_user, 'public.palanart_external_identities', 'SELECT') then
    raise exception 'Anonymous data access is exposed';
  end if;
end;
$$;
rollback;
select 'passed: profile trigger, own-row access, role protection, private state, anonymous denial; fixtures rolled back' as result;
