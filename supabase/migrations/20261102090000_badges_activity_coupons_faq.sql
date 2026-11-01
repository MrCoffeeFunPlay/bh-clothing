-- BH Clothing:
--   * Badges: every tag explains how it is earned (shown to members on their Badges page).
--   * Activity log for the owner: orders, sign-ins, new accounts, catalogue changes (with old → new prices), coupons,
--     member tags, automations, FAQ and legal papers. Written only by the database itself (triggers), read only by admins.
--   * Coupons kept in the database (were only in the owner's browser), with dates and usage limits.
--   * FAQ kept in the database, so the owner can add, edit and remove questions.
--   * Each member's site language (English by default, Hebrew optional).

-- ---- Badges --------------------------------------------------------------------------------------------------------
alter table public.tags add column how_to_earn text not null default '' check (length(how_to_earn) <= 300);
update public.tags set how_to_earn = case rule
  when 'phone_verified' then 'Verify your phone number in Account settings.'
  else how_to_earn end;
update public.tags set how_to_earn = 'Given by BH to our most loyal customers.' where name = 'Top Buyer' and how_to_earn = '';
update public.tags set how_to_earn = 'Comes with the ' || name || ' plan in BH Club (plans open soon).' where name in ('BH Core', 'BH Plus', 'BH Black') and how_to_earn = '';

-- ---- Language ------------------------------------------------------------------------------------------------------
alter table public.profiles add column language text not null default 'en' check (language in ('en', 'he'));

-- ---- Activity log --------------------------------------------------------------------------------------------------
create table public.activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category text not null check (category in ('orders', 'sign_ins', 'accounts', 'catalog', 'coupons', 'members', 'automations', 'content', 'papers')),
  action text not null check (length(action) <= 60),
  summary text not null check (length(summary) <= 1000),
  actor_id uuid,
  actor_email text not null default '',
  details jsonb not null default '{}'::jsonb
);
create index activity_log_recent on public.activity_log (created_at desc);
create index activity_log_category on public.activity_log (category, created_at desc);
alter table public.activity_log enable row level security;
create policy "Admins read the activity log" on public.activity_log for select to authenticated using ((select public.is_catalog_admin()));
revoke all on table public.activity_log from anon, authenticated;
grant select on table public.activity_log to authenticated;

-- Only the database writes the log (from the triggers below); nobody can add, change or remove entries through the API.
create or replace function public.write_activity(category text, action text, summary text, details jsonb default '{}'::jsonb, actor uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid := coalesce(actor, auth.uid());
begin
  insert into public.activity_log (category, action, summary, actor_id, actor_email, details)
  values (category, action, left(summary, 1000), who, coalesce((select u.email from auth.users u where u.id = who), ''), coalesce(details, '{}'::jsonb));
end;
$$;
revoke all on function public.write_activity(text, text, text, jsonb, uuid) from public, anon, authenticated;

create or replace function public.money_text(amount numeric, currency text)
returns text
language sql
immutable
set search_path = ''
as $$ select case when amount is null then 'none' else (case currency when 'USD' then '$' else '₪' end) || trim(to_char(amount, 'FM999999990.00')) end $$;

-- Orders: created, and changes to status, payment status or tracking.
create or replace function public.log_order_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changes text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.write_activity('orders', 'Order created', new.order_number || ' for ' || coalesce(nullif(new.customer_name, ''), 'a customer') || ' · ' || public.money_text(new.total, new.currency) || case when new.is_test then ' (test order)' else '' end, jsonb_build_object('order', new.order_number));
    return new;
  end if;
  if new.status is distinct from old.status then changes := changes || ('status ' || old.status || ' → ' || new.status); end if;
  if new.payment_status is distinct from old.payment_status then changes := changes || ('payment ' || old.payment_status || ' → ' || new.payment_status); end if;
  if new.tracking_number is distinct from old.tracking_number then changes := changes || ('tracking ' || coalesce(nullif(new.tracking_number, ''), 'removed')); end if;
  if new.total is distinct from old.total then changes := changes || ('total ' || public.money_text(old.total, old.currency) || ' → ' || public.money_text(new.total, new.currency)); end if;
  if cardinality(changes) > 0 then
    perform public.write_activity('orders', 'Order updated', new.order_number || ': ' || array_to_string(changes, ', '), jsonb_build_object('order', new.order_number));
  end if;
  return new;
end;
$$;
create trigger orders_activity after insert or update on public.orders for each row execute function public.log_order_activity();

-- Sign-ins and new accounts.
create or replace function public.log_account_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_activity('accounts', 'New account', coalesce(new.email, 'A member') || ' created an account', '{}'::jsonb, new.id);
  elsif new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then
    perform public.write_activity('sign_ins', 'Signed in', coalesce(new.email, 'A member') || ' signed in', '{}'::jsonb, new.id);
  end if;
  return new;
end;
$$;
create trigger users_activity after insert or update of last_sign_in_at on auth.users for each row execute function public.log_account_activity();

-- Catalogue: one entry per save, listing what changed (old → new), including fabric-weight prices.
create or replace function public.catalog_change_summary(before_row jsonb, after_row jsonb, before_prices jsonb, after_prices jsonb, before_colours text[], after_colours text[])
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  changes text[] := '{}';
  w text;
  field text;
  label text;
  old_value numeric;
  new_value numeric;
begin
  if before_row is null then return 'added to the catalogue'; end if;
  if before_row ->> 'name' is distinct from after_row ->> 'name' then changes := changes || ('name "' || (before_row ->> 'name') || '" → "' || (after_row ->> 'name') || '"'); end if;
  if before_row ->> 'active' is distinct from after_row ->> 'active' then changes := changes || (case when (after_row ->> 'active')::boolean then 'shown in the store' else 'hidden from the store' end); end if;
  if before_row ->> 'coming_soon' is distinct from after_row ->> 'coming_soon' then changes := changes || (case when (after_row ->> 'coming_soon')::boolean then 'set to coming soon' else 'no longer coming soon' end); end if;
  if before_row ->> 'category_slug' is distinct from after_row ->> 'category_slug' then changes := changes || ('category ' || (before_row ->> 'category_slug') || ' → ' || (after_row ->> 'category_slug')); end if;
  if (before_row ->> 'price_ils')::numeric is distinct from (after_row ->> 'price_ils')::numeric then changes := changes || ('price ' || public.money_text((before_row ->> 'price_ils')::numeric, 'ILS') || ' → ' || public.money_text((after_row ->> 'price_ils')::numeric, 'ILS')); end if;
  if (before_row ->> 'price_usd')::numeric is distinct from (after_row ->> 'price_usd')::numeric then changes := changes || ('price ' || public.money_text((before_row ->> 'price_usd')::numeric, 'USD') || ' → ' || public.money_text((after_row ->> 'price_usd')::numeric, 'USD')); end if;
  if before_row ->> 'sale_enabled' is distinct from after_row ->> 'sale_enabled' then
    changes := changes || (case when (after_row ->> 'sale_enabled')::boolean then 'sale on' else 'sale off' end);
  elsif (after_row ->> 'sale_enabled')::boolean and (before_row ->> 'sale_value' is distinct from after_row ->> 'sale_value' or before_row ->> 'sale_kind' is distinct from after_row ->> 'sale_kind') then
    changes := changes || 'sale changed'::text;
  end if;
  for w in select distinct key from (select jsonb_object_keys(coalesce(before_prices, '{}'::jsonb)) as key union select jsonb_object_keys(coalesce(after_prices, '{}'::jsonb))) keys order by 1 loop
    foreach field in array array['price_ils', 'price_usd', 'sale_price_ils', 'sale_price_usd'] loop
      old_value := (before_prices -> w ->> field)::numeric;
      new_value := (after_prices -> w ->> field)::numeric;
      if old_value is distinct from new_value then
        label := case when field like 'sale_%' then ' sale price ' else ' price ' end;
        changes := changes || (w || label || public.money_text(old_value, upper(right(field, 3))) || ' → ' || public.money_text(new_value, upper(right(field, 3))));
      end if;
    end loop;
  end loop;
  if before_colours is distinct from after_colours then changes := changes || ('colours: ' || array_to_string(after_colours, ', ')); end if;
  if before_row ->> 'description' is distinct from after_row ->> 'description' then changes := changes || 'description edited'::text; end if;
  if before_row ->> 'sizes' is distinct from after_row ->> 'sizes' then changes := changes || 'sizes changed'::text; end if;
  if cardinality(changes) = 0 then return null; end if;
  return array_to_string(changes, ', ');
end;
$$;

create or replace function public.catalog_prices(of_product integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(w.weight, jsonb_build_object('price_ils', w.price_ils, 'price_usd', w.price_usd, 'sale_price_ils', w.sale_price_ils, 'sale_price_usd', w.sale_price_usd)), '{}'::jsonb)
  from public.product_weight_prices w where w.product_id = of_product
$$;

create or replace function public.catalog_colours(of_product integer)
returns text[]
language sql
stable
set search_path = ''
as $$ select coalesce(array_agg(c.name order by c.sort_order), '{}') from public.product_colours c where c.product_id = of_product $$;

-- admin_save_product runs with the admin's own permissions, so it records its entry through this (admins only).
create or replace function public.record_catalog_change(product_id integer, action text, summary text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_catalog_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  perform public.write_activity('catalog', left(action, 60), summary, jsonb_build_object('product_id', product_id));
end;
$$;
revoke all on function public.record_catalog_change(integer, text, text) from public, anon;
grant execute on function public.record_catalog_change(integer, text, text) to authenticated;

-- Same as before, plus one activity-log entry describing the change.
create or replace function public.admin_save_product(product jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id integer := nullif(product ->> 'id', '')::integer;
  base_slug text;
  colour_names text[];
  before_row jsonb;
  before_prices jsonb;
  before_colours text[];
  summary text;
begin
  if not public.is_catalog_admin() then
    raise exception 'Only an authorised BH admin can change the catalogue.' using errcode = '42501';
  end if;

  if saved_id is not null then
    select to_jsonb(p) into before_row from public.products p where p.id = saved_id;
    before_prices := public.catalog_prices(saved_id);
    before_colours := public.catalog_colours(saved_id);
    update public.products set
      name = trim(product ->> 'name'),
      category_slug = product ->> 'category_slug',
      description = coalesce(product ->> 'description', ''),
      tag = nullif(product ->> 'tag', ''),
      sizes = coalesce((select array_agg(value) from jsonb_array_elements_text(product -> 'sizes')), '{}'),
      fabric_weights = coalesce((select array_agg(value) from jsonb_array_elements_text(product -> 'fabric_weights')), '{}'),
      price_ils = nullif(product ->> 'price_ils', '')::numeric,
      price_usd = nullif(product ->> 'price_usd', '')::numeric,
      lookbook_images = coalesce((select array_agg(value) from jsonb_array_elements_text(product -> 'lookbook_images')), '{}'),
      sale_enabled = coalesce((product ->> 'sale_enabled')::boolean, false),
      sale_title = coalesce(product ->> 'sale_title', ''),
      sale_kind = coalesce(product ->> 'sale_kind', 'percent'),
      sale_value = coalesce(nullif(product ->> 'sale_value', '')::numeric, 0),
      sale_currency = coalesce(product ->> 'sale_currency', 'ILS'),
      sale_starts_at = nullif(product ->> 'sale_starts_at', '')::timestamptz,
      sale_ends_at = nullif(product ->> 'sale_ends_at', '')::timestamptz,
      active = coalesce((product ->> 'active')::boolean, true),
      coming_soon = coalesce((product ->> 'coming_soon')::boolean, false)
    where id = saved_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'This product no longer exists.' using errcode = 'P0002';
    end if;
  else
    base_slug := trim(both '-' from lower(regexp_replace(coalesce(product ->> 'name', ''), '[^a-zA-Z0-9]+', '-', 'g')));
    if base_slug = '' then base_slug := 'product'; end if;
    if exists (select 1 from public.products where slug = base_slug) then
      base_slug := base_slug || '-' || substr(md5(random()::text), 1, 5);
    end if;
    insert into public.products (slug, name, category_slug, description, tag, sizes, fabric_weights, price_ils, price_usd,
      lookbook_images, sale_enabled, sale_title, sale_kind, sale_value, sale_currency, sale_starts_at, sale_ends_at, active, coming_soon, sort_order)
    values (
      base_slug,
      trim(product ->> 'name'),
      product ->> 'category_slug',
      coalesce(product ->> 'description', ''),
      nullif(product ->> 'tag', ''),
      coalesce((select array_agg(value) from jsonb_array_elements_text(product -> 'sizes')), '{}'),
      coalesce((select array_agg(value) from jsonb_array_elements_text(product -> 'fabric_weights')), '{}'),
      nullif(product ->> 'price_ils', '')::numeric,
      nullif(product ->> 'price_usd', '')::numeric,
      coalesce((select array_agg(value) from jsonb_array_elements_text(product -> 'lookbook_images')), '{}'),
      coalesce((product ->> 'sale_enabled')::boolean, false),
      coalesce(product ->> 'sale_title', ''),
      coalesce(product ->> 'sale_kind', 'percent'),
      coalesce(nullif(product ->> 'sale_value', '')::numeric, 0),
      coalesce(product ->> 'sale_currency', 'ILS'),
      nullif(product ->> 'sale_starts_at', '')::timestamptz,
      nullif(product ->> 'sale_ends_at', '')::timestamptz,
      coalesce((product ->> 'active')::boolean, true),
      coalesce((product ->> 'coming_soon')::boolean, false),
      coalesce((select max(sort_order) + 10 from public.products), 10)
    )
    returning id into saved_id;
  end if;

  delete from public.product_colours c where c.product_id = saved_id;
  insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order)
  select saved_id, trim(c ->> 'name'), coalesce(nullif(c ->> 'hex', ''), '#8d8275'), c ->> 'front_image',
         nullif(c ->> 'back_image', ''), (n - 1)::integer
  from jsonb_array_elements(coalesce(product -> 'colours', '[]'::jsonb)) with ordinality as t (c, n);

  select coalesce(array_agg(c.name), '{}') into colour_names from public.product_colours c where c.product_id = saved_id;
  if cardinality(colour_names) = 0 then
    raise exception 'Add at least one colour with a front image.' using errcode = '23514';
  end if;

  delete from public.product_weight_prices w where w.product_id = saved_id;
  insert into public.product_weight_prices (product_id, weight, price_ils, price_usd, sale_price_ils, sale_price_usd, colours)
  select saved_id, w ->> 'weight',
         nullif(w ->> 'price_ils', '')::numeric, nullif(w ->> 'price_usd', '')::numeric,
         nullif(w ->> 'sale_price_ils', '')::numeric, nullif(w ->> 'sale_price_usd', '')::numeric,
         coalesce((select array_agg(value) from jsonb_array_elements_text(w -> 'colours')), '{}')
  from jsonb_array_elements(coalesce(product -> 'weight_prices', '[]'::jsonb)) as t (w);

  if exists (
    select 1 from public.product_weight_prices w
    where w.product_id = saved_id and not (w.colours <@ colour_names)
  ) then
    raise exception 'A fabric weight lists a colour that the product does not have.' using errcode = '23514';
  end if;

  summary := public.catalog_change_summary(before_row, (select to_jsonb(p) from public.products p where p.id = saved_id),
    before_prices, public.catalog_prices(saved_id), before_colours, public.catalog_colours(saved_id));
  if summary is not null then
    perform public.record_catalog_change(saved_id, case when before_row is null then 'Product added' else 'Product changed' end, trim(product ->> 'name') || ': ' || summary);
  end if;
  return saved_id;
end;
$$;

create or replace function public.log_product_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.write_activity('catalog', 'Product removed', old.name || ' was removed from the catalogue', jsonb_build_object('product_id', old.id));
  return old;
end;
$$;
create trigger products_removed_activity after delete on public.products for each row execute function public.log_product_removed();

-- Member tags given or taken away.
create or replace function public.log_member_tag_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  tag_name text := (select t.name from public.tags t where t.id = case when tg_op = 'DELETE' then old.tag_id else new.tag_id end);
  member_email text := coalesce((select u.email from auth.users u where u.id = member_id), 'a member');
begin
  if tg_op = 'INSERT' then
    perform public.write_activity('members', 'Tag given', coalesce(tag_name, 'A tag') || ' given to ' || member_email);
  else
    perform public.write_activity('members', 'Tag removed', coalesce(tag_name, 'A tag') || ' removed from ' || member_email);
  end if;
  return null;
end;
$$;
create trigger user_tags_activity after insert or delete on public.user_tags for each row execute function public.log_member_tag_activity();

-- Tags themselves (created, edited, deleted).
create or replace function public.log_tag_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then perform public.write_activity('members', 'Tag created', 'Tag "' || new.name || '" created');
  elsif tg_op = 'DELETE' then perform public.write_activity('members', 'Tag deleted', 'Tag "' || old.name || '" deleted');
  else perform public.write_activity('members', 'Tag edited', 'Tag "' || new.name || '" edited');
  end if;
  return null;
end;
$$;
create trigger tags_activity after insert or update or delete on public.tags for each row execute function public.log_tag_activity();

-- Automations.
create or replace function public.log_automation_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then perform public.write_activity('automations', 'Automation created', '"' || new.name || '" created' || case when new.active then ' and switched on' else '' end);
  elsif tg_op = 'DELETE' then perform public.write_activity('automations', 'Automation deleted', '"' || old.name || '" deleted');
  elsif new.active is distinct from old.active then perform public.write_activity('automations', case when new.active then 'Automation on' else 'Automation off' end, '"' || new.name || '" switched ' || case when new.active then 'on' else 'off' end);
  else perform public.write_activity('automations', 'Automation edited', '"' || new.name || '" edited');
  end if;
  return null;
end;
$$;
create trigger automations_activity after insert or update or delete on public.automations for each row execute function public.log_automation_activity();

-- ---- Coupons -------------------------------------------------------------------------------------------------------
create table public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$'),
  kind text not null check (kind in ('percent', 'fixed')),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'ILS' check (currency in ('ILS', 'USD')),
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer check (max_uses > 0),             -- null: no limit for everyone together ("first 50" = 50)
  per_customer_limit integer check (per_customer_limit > 0), -- null: a customer may use it as often as they like
  times_used integer not null default 0 check (times_used >= 0),
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or amount <= 100),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);
create trigger coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
alter table public.coupons enable row level security;
create policy "Admins read coupons" on public.coupons for select to authenticated using ((select public.is_catalog_admin()));
create policy "Admins create coupons" on public.coupons for insert to authenticated with check ((select public.is_catalog_admin()));
create policy "Admins edit coupons" on public.coupons for update to authenticated using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy "Admins delete coupons" on public.coupons for delete to authenticated using ((select public.is_catalog_admin()));
revoke all on table public.coupons from anon, authenticated;
grant select, insert, update, delete on table public.coupons to authenticated;
grant usage on sequence public.coupons_id_seq to authenticated;

create or replace function public.coupon_text(c public.coupons)
returns text
language sql
immutable
set search_path = ''
as $$ select case when c.kind = 'percent' then rtrim(to_char(c.amount, 'FM990.99'), '.') || '% off' else public.money_text(c.amount, c.currency) || ' off' end $$;

create or replace function public.log_coupon_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changes text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.write_activity('coupons', 'Coupon created', new.code || ' · ' || public.coupon_text(new)
      || case when new.max_uses is null then '' else ' · first ' || new.max_uses || ' uses' end
      || case when new.expires_at is null then '' else ' · ends ' || to_char(new.expires_at at time zone 'Asia/Jerusalem', 'DD Mon YYYY') end);
  elsif tg_op = 'DELETE' then
    perform public.write_activity('coupons', 'Coupon deleted', old.code || ' deleted');
  else
    if new.active is distinct from old.active then changes := changes || (case when new.active then 'switched on' else 'paused' end); end if;
    if new.amount is distinct from old.amount or new.kind is distinct from old.kind or new.currency is distinct from old.currency then changes := changes || (public.coupon_text(old) || ' → ' || public.coupon_text(new)); end if;
    if new.expires_at is distinct from old.expires_at then changes := changes || ('end date ' || coalesce(to_char(new.expires_at at time zone 'Asia/Jerusalem', 'DD Mon YYYY'), 'removed')); end if;
    if new.max_uses is distinct from old.max_uses then changes := changes || ('total uses ' || coalesce(new.max_uses::text, 'unlimited')); end if;
    if new.per_customer_limit is distinct from old.per_customer_limit then changes := changes || ('uses per customer ' || coalesce(new.per_customer_limit::text, 'unlimited')); end if;
    if cardinality(changes) > 0 then perform public.write_activity('coupons', 'Coupon changed', new.code || ': ' || array_to_string(changes, ', ')); end if;
  end if;
  return null;
end;
$$;
-- The coupon the owner had in their browser (added before the log starts watching coupons).
insert into public.coupons (code, kind, amount, per_customer_limit, note, created_by) values ('WELCOME10', 'percent', 10, 1, 'Welcome offer for new members', null);
create trigger coupons_activity after insert or update or delete on public.coupons for each row execute function public.log_coupon_activity();

-- ---- FAQ -----------------------------------------------------------------------------------------------------------
create table public.faq_items (
  id bigint generated always as identity primary key,
  question text not null check (length(trim(question)) between 3 and 200),
  answer text not null check (length(trim(answer)) between 1 and 2000),
  question_he text not null default '' check (length(question_he) <= 200),
  answer_he text not null default '' check (length(answer_he) <= 2000),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger faq_items_updated_at before update on public.faq_items for each row execute function public.set_updated_at();
alter table public.faq_items enable row level security;
create policy "Everyone reads shown questions" on public.faq_items for select to anon using (active);
create policy "Members read shown questions, admins all" on public.faq_items for select to authenticated using (active or (select public.is_catalog_admin()));
create policy "Admins add questions" on public.faq_items for insert to authenticated with check ((select public.is_catalog_admin()));
create policy "Admins edit questions" on public.faq_items for update to authenticated using ((select public.is_catalog_admin())) with check ((select public.is_catalog_admin()));
create policy "Admins remove questions" on public.faq_items for delete to authenticated using ((select public.is_catalog_admin()));
revoke all on table public.faq_items from anon, authenticated;
grant select on table public.faq_items to anon, authenticated;
grant insert, update, delete on table public.faq_items to authenticated;

create or replace function public.log_faq_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then perform public.write_activity('content', 'FAQ question added', '"' || new.question || '"');
  elsif tg_op = 'DELETE' then perform public.write_activity('content', 'FAQ question removed', '"' || old.question || '"');
  elsif new.active is distinct from old.active then perform public.write_activity('content', case when new.active then 'FAQ question shown' else 'FAQ question hidden' end, '"' || new.question || '"');
  elsif (new.question, new.answer, new.question_he, new.answer_he) is distinct from (old.question, old.answer, old.question_he, old.answer_he) then
    perform public.write_activity('content', 'FAQ question edited', '"' || new.question || '"');
  end if;
  return null;
end;
$$;
-- The questions shown on the site today (added before the log starts watching the FAQ).
insert into public.faq_items (question, answer, sort_order) values
  ('Where do you ship?', 'BH is designed for international shipping. Delivery time and price appear at checkout.', 10),
  ('How do BH Points work?', 'Earn them after eligible purchases; use them later as cart credit or a BH Gift Card.', 20),
  ('Can I return something?', 'Eligible pieces can be requested for return within 30 days of delivery.', 30);
create trigger faq_items_activity after insert or update or delete on public.faq_items for each row execute function public.log_faq_activity();

-- ---- Papers (privacy policy and terms live in the site's code; each change is recorded here when it is published) ---
insert into public.activity_log (created_at, category, action, summary) values
  ('2026-10-29 12:00:00+02', 'papers', 'Papers published', 'Privacy policy and terms of use published'),
  (now(), 'papers', 'Papers updated', 'Privacy policy and terms of use (1 November 2026): contact is support@bhclothing.fashion, business email provider listed, country no longer asked, currency set from the device time zone until chosen');
