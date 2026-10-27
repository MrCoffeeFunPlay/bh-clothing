-- BH Clothing: profile pictures, member tags (badges shown under a member's name) and phone verification.

-- 1. Profile pictures ------------------------------------------------------------------------------------------------
alter table public.profiles add column avatar_url text not null default '' check (length(avatar_url) <= 500);

-- Public bucket (pictures are shown next to reviews). Each member may only write inside their own folder: <user id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Members upload their own picture" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Members delete their own picture" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. Tags ---------------------------------------------------------------------------------------------------------
-- rule = 'manual': the owner gives the tag to people. rule = 'phone_verified': members get it by verifying their phone.
create table public.tags (
  id bigint generated always as identity primary key,
  name text not null unique check (length(btrim(name)) between 1 and 30),
  icon text not null default 'badge-check'
    check (icon in ('badge-check', 'shield-check', 'crown', 'sparkles', 'gem', 'star', 'heart', 'flame', 'zap', 'trophy')),
  colour text not null default '#8a5a3c' check (colour ~ '^#[0-9a-fA-F]{6}$'),
  description text not null default '' check (length(description) <= 160),
  rule text not null default 'manual' check (rule in ('manual', 'phone_verified')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.user_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_id bigint not null references public.tags (id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);
create index user_tags_tag_id_idx on public.user_tags (tag_id);

alter table public.tags enable row level security;
alter table public.user_tags enable row level security;

create policy "Everyone reads tags" on public.tags for select to anon, authenticated using (true);
create policy "Admins create tags" on public.tags for insert to authenticated with check ((select public.is_catalog_admin()));
create policy "Admins edit tags" on public.tags for update to authenticated
  using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy "Admins delete tags" on public.tags for delete to authenticated using ((select public.is_catalog_admin()));

create policy "Members read their own tags" on public.user_tags for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_catalog_admin()));
create policy "Admins give tags" on public.user_tags for insert to authenticated with check ((select public.is_catalog_admin()));
create policy "Admins remove tags" on public.user_tags for delete to authenticated using ((select public.is_catalog_admin()));

revoke all on table public.tags, public.user_tags from anon, authenticated;
grant select on table public.tags to anon, authenticated;
grant insert, update, delete on table public.tags to authenticated;
grant select, insert, delete on table public.user_tags to authenticated;

insert into public.tags (name, icon, colour, description, rule, sort_order) values
  ('Verified', 'shield-check', '#2f7d5b', 'Verified their phone number.', 'phone_verified', 1),
  ('Top Buyer', 'gem', '#8a5a3c', 'One of our most loyal customers.', 'manual', 2),
  ('BH Core', 'crown', '#6f6a64', 'BH Core plan member.', 'manual', 3),
  ('BH Plus', 'sparkles', '#a8743f', 'BH Plus plan member.', 'manual', 4),
  ('BH Black', 'crown', '#2b2420', 'BH Black plan member.', 'manual', 5);

-- 3. Phone verification -------------------------------------------------------------------------------------------
-- After Supabase Auth confirms the member's phone (auth.users.phone_confirmed_at), they collect the phone tags.
create or replace function public.claim_phone_tags()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  if not exists (select 1 from auth.users u where u.id = auth.uid() and u.phone_confirmed_at is not null) then
    return 0;
  end if;
  insert into public.user_tags (user_id, tag_id)
  select auth.uid(), t.id from public.tags t where t.rule = 'phone_verified'
  on conflict do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;
revoke all on function public.claim_phone_tags() from public, anon;
grant execute on function public.claim_phone_tags() to authenticated;

-- 4. Owner tools: find members to give tags to (email lives in auth.users, so this runs as definer for admins only).
create or replace function public.admin_find_members(search text)
returns table (id uuid, email text, first_name text, last_name text, username text, avatar_url text, tag_ids bigint[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_catalog_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, coalesce(p.first_name, ''), coalesce(p.last_name, ''), coalesce(p.username, ''), coalesce(p.avatar_url, ''),
      coalesce((select array_agg(ut.tag_id order by ut.tag_id) from public.user_tags ut where ut.user_id = u.id), '{}')
    from auth.users u
    left join public.profiles p on p.id = u.id
    where coalesce(btrim(search), '') = ''
      or u.email ilike '%' || btrim(search) || '%'
      or (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ilike '%' || btrim(search) || '%'
      or p.username ilike '%' || btrim(search) || '%'
    order by u.created_at desc
    limit 25;
end;
$$;
revoke all on function public.admin_find_members(text) from public, anon;
grant execute on function public.admin_find_members(text) to authenticated;
