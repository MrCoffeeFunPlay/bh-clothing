-- BH Clothing: automations (Owner area). Each one is a rule ("member hasn't signed in for 30 days") plus the message
-- that member should get. Only admins can see or change them. Sending is done later by a scheduled job once an email
-- service is connected; until then automations are prepared here and nothing is sent.

create table public.automations (
  id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) between 1 and 60),
  trigger text not null check (trigger in ('welcome', 'no_sign_in', 'no_order', 'birthday', 'cart_left')),
  days integer not null default 0 check (days between 0 and 365),
  channel text not null default 'email' check (channel in ('email')),
  subject text not null check (length(btrim(subject)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 4000),
  coupon_code text not null default '' check (length(coupon_code) <= 40),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger automations_updated_at before update on public.automations
  for each row execute function public.set_updated_at();

alter table public.automations enable row level security;
create policy "Admins read automations" on public.automations for select to authenticated using ((select public.is_catalog_admin()));
create policy "Admins create automations" on public.automations for insert to authenticated with check ((select public.is_catalog_admin()));
create policy "Admins edit automations" on public.automations for update to authenticated
  using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy "Admins delete automations" on public.automations for delete to authenticated using ((select public.is_catalog_admin()));

revoke all on table public.automations from anon, authenticated;
grant select, insert, update, delete on table public.automations to authenticated;

insert into public.automations (name, trigger, days, subject, body, coupon_code) values
  ('Welcome to BH', 'welcome', 0, 'Welcome to BH, {first_name}',
   E'Hi {first_name},\n\nThanks for joining BH Clothing. Your account is ready: save your details, collect BH Points and be first to see new drops.\n\n{store_link}', ''),
  ('We miss you', 'no_sign_in', 30, '{first_name}, it''s been a while',
   E'Hi {first_name},\n\nIt''s been {days} days since we last saw you. New pieces have landed since then. Come and have a look.\n\n{store_link}', ''),
  ('Come back for something new', 'no_order', 60, 'A little something for your next piece',
   E'Hi {first_name},\n\nIt''s been {days} days since your last order. Here is a code for your next one: {coupon}\n\n{store_link}', 'BACK10'),
  ('Happy birthday', 'birthday', 0, 'Happy birthday, {first_name}!',
   E'Happy birthday, {first_name}!\n\nYour BH birthday gift is waiting: use {coupon} on any piece this week.\n\n{store_link}', 'BDAY15'),
  ('Left in your bag', 'cart_left', 1, 'Still thinking it over?',
   E'Hi {first_name},\n\nYou left something in your BH bag. It''s still there when you''re ready.\n\n{store_link}', '');

-- How many members the rule matches today (shown next to each automation). Order and bag rules need online orders
-- and saved bags, which the store doesn't keep yet, so they return null.
create or replace function public.admin_automation_reach(rule text, after_days integer)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_catalog_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return case rule
    when 'welcome' then (select count(*)::integer from auth.users u where u.created_at > now() - interval '1 day')
    when 'no_sign_in' then (select count(*)::integer from auth.users u
                            where coalesce(u.last_sign_in_at, u.created_at) < now() - make_interval(days => greatest(after_days, 0)))
    when 'birthday' then (select count(*)::integer from public.profiles p
                          where p.birthday is not null and to_char(p.birthday, 'MM-DD') = to_char(now(), 'MM-DD'))
    else null
  end;
end;
$$;
revoke all on function public.admin_automation_reach(text, integer) from public, anon;
grant execute on function public.admin_automation_reach(text, integer) to authenticated;
