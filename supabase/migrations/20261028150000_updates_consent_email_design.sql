-- BH Clothing: members choose whether they want BH updates (marketing emails), at sign-up, at sign-in or in their
-- settings. Marketing automations only reach members who said yes. The time of the "yes" is kept as a consent record.

alter table public.profiles
  add column marketing_opt_in boolean not null default false,
  add column marketing_opt_in_at timestamptz;

-- The database sets the consent time itself (members cannot send their own): when they switch updates on, and it is
-- cleared when they switch them off.
create or replace function public.stamp_marketing_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.marketing_opt_in then
    new.marketing_opt_in_at := null;
  elsif tg_op = 'INSERT' or not old.marketing_opt_in then
    new.marketing_opt_in_at := now();
  else
    new.marketing_opt_in_at := old.marketing_opt_in_at;
  end if;
  return new;
end;
$$;

create trigger profiles_marketing_consent before insert or update on public.profiles
  for each row execute function public.stamp_marketing_consent();

-- Automations: marketing messages go only to members who want updates (the welcome email is a service message).
-- button_label is the text on the email's main button.
alter table public.automations
  add column marketing boolean not null default true,
  add column button_label text not null default 'Visit BH Clothing' check (length(btrim(button_label)) between 1 and 40);
update public.automations set marketing = false where trigger = 'welcome';
update public.automations set button_label = 'Start exploring' where trigger = 'welcome';
update public.automations set button_label = 'See what''s new' where trigger = 'no_sign_in';
update public.automations set button_label = 'Use my code' where trigger in ('no_order', 'birthday');
update public.automations set button_label = 'Back to my bag' where trigger = 'cart_left';

drop function public.admin_automation_reach(text, integer);
create function public.admin_automation_reach(rule text, after_days integer, only_opted_in boolean default true)
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
    when 'welcome' then (select count(*)::integer from auth.users u left join public.profiles p on p.id = u.id
                         where u.created_at > now() - interval '1 day' and (not only_opted_in or coalesce(p.marketing_opt_in, false)))
    when 'no_sign_in' then (select count(*)::integer from auth.users u left join public.profiles p on p.id = u.id
                            where coalesce(u.last_sign_in_at, u.created_at) < now() - make_interval(days => greatest(after_days, 0))
                              and (not only_opted_in or coalesce(p.marketing_opt_in, false)))
    when 'birthday' then (select count(*)::integer from public.profiles p
                          where p.birthday is not null and to_char(p.birthday, 'MM-DD') = to_char(now(), 'MM-DD')
                            and (not only_opted_in or p.marketing_opt_in))
    else null
  end;
end;
$$;
revoke all on function public.admin_automation_reach(text, integer, boolean) from public, anon;
grant execute on function public.admin_automation_reach(text, integer, boolean) to authenticated;
