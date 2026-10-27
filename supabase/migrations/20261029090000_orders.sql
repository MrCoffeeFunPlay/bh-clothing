-- BH Clothing: orders. Stage 1 (before card payments): the owner records orders by hand (for example a sale over
-- Instagram, WhatsApp or Bit), members see their own orders in their account, and the receipt number/link from the
-- receipts service can be attached to each order. Later the website checkout will create orders here too.
-- Orders are never deleted (they are business records); they are cancelled or marked returned instead.

create table public.orders (
  id bigint generated always as identity primary key,
  order_number text generated always as ('BH-' || lpad(id::text, 5, '0')) stored unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null check (length(btrim(customer_name)) between 1 and 120),
  customer_email text not null default '' check (length(customer_email) <= 200),
  customer_phone text not null default '' check (length(customer_phone) <= 40),
  address_line text not null default '' check (length(address_line) <= 200),
  city text not null default '' check (length(city) <= 80),
  postal_code text not null default '' check (length(postal_code) <= 20),
  country text not null default '' check (length(country) <= 60),
  currency text not null default 'ILS' check (currency in ('ILS', 'USD')),
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  shipping numeric(10, 2) not null default 0 check (shipping >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  payment_method text not null default 'other' check (payment_method in ('card', 'bit', 'paybox', 'bank_transfer', 'cash', 'other')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  status text not null default 'new' check (status in ('new', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  tracking_number text not null default '' check (length(tracking_number) <= 80),
  tracking_url text not null default '' check (length(tracking_url) <= 500),
  receipt_number text not null default '' check (length(receipt_number) <= 40),
  receipt_url text not null default '' check (length(receipt_url) <= 500),
  notes text not null default '' check (length(notes) <= 2000),
  source text not null default 'manual' check (source in ('manual', 'website')),
  paid_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_id_idx on public.orders (user_id);
create index orders_created_at_idx on public.orders (created_at desc);

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  product_name text not null check (length(btrim(product_name)) between 1 and 120),
  colour text not null default '' check (length(colour) <= 40),
  size text not null default '' check (length(size) <= 20),
  fabric_weight text not null default '' check (length(fabric_weight) <= 20),
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  image text not null default '' check (length(image) <= 500),
  sort_order integer not null default 0
);
create index order_items_order_id_idx on public.order_items (order_id);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- When an order becomes paid or shipped, the database notes the time.
create or replace function public.stamp_order_times()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.payment_status = 'paid' and (tg_op = 'INSERT' or old.payment_status <> 'paid') then new.paid_at := now(); end if;
  if new.payment_status = 'unpaid' then new.paid_at := null; end if;
  if new.status in ('shipped', 'delivered') and (tg_op = 'INSERT' or old.status not in ('shipped', 'delivered')) then new.shipped_at := now(); end if;
  if new.status in ('new', 'processing') then new.shipped_at := null; end if;
  return new;
end;
$$;
create trigger orders_times before insert or update on public.orders
  for each row execute function public.stamp_order_times();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Members read their own orders; admins read everything. Only admins change orders (through admin_save_order).
create policy "Members read their own orders" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_catalog_admin()));
create policy "Members read their own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_catalog_admin()))));

revoke all on table public.orders, public.order_items from anon, authenticated;
grant select on table public.orders, public.order_items to authenticated;

-- Create or update an order in one step. Totals are always worked out here from the items (never trusted from the
-- browser), and the order is linked to the member's account when the email matches one.
create or replace function public.admin_save_order(input jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id bigint := nullif(input->>'id', '')::bigint;
  items jsonb := coalesce(input->'items', '[]'::jsonb);
  sub numeric(10, 2);
  member uuid;
  wanted_email text := lower(btrim(coalesce(input->>'customer_email', '')));
begin
  if not public.is_catalog_admin() then
    raise exception 'Only an authorised BH admin can change orders.' using errcode = '42501';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'An order needs at least one item.' using errcode = '22023';
  end if;
  select coalesce(sum((i->>'quantity')::integer * (i->>'unit_price')::numeric), 0) into sub from jsonb_array_elements(items) i;
  if wanted_email <> '' then select u.id into member from auth.users u where lower(u.email) = wanted_email limit 1; end if;

  if saved_id is null then
    insert into public.orders (user_id, customer_name, customer_email, customer_phone, address_line, city, postal_code, country, currency,
      subtotal, discount, shipping, total, payment_method, payment_status, status, tracking_number, tracking_url, receipt_number, receipt_url, notes, source)
    values (member, input->>'customer_name', wanted_email, coalesce(input->>'customer_phone', ''), coalesce(input->>'address_line', ''),
      coalesce(input->>'city', ''), coalesce(input->>'postal_code', ''), coalesce(input->>'country', ''), coalesce(input->>'currency', 'ILS'),
      sub, coalesce((input->>'discount')::numeric, 0), coalesce((input->>'shipping')::numeric, 0),
      sub - coalesce((input->>'discount')::numeric, 0) + coalesce((input->>'shipping')::numeric, 0),
      coalesce(input->>'payment_method', 'other'), coalesce(input->>'payment_status', 'unpaid'), coalesce(input->>'status', 'new'),
      coalesce(input->>'tracking_number', ''), coalesce(input->>'tracking_url', ''), coalesce(input->>'receipt_number', ''),
      coalesce(input->>'receipt_url', ''), coalesce(input->>'notes', ''), 'manual')
    returning id into saved_id;
  else
    update public.orders set user_id = member, customer_name = input->>'customer_name', customer_email = wanted_email,
      customer_phone = coalesce(input->>'customer_phone', ''), address_line = coalesce(input->>'address_line', ''), city = coalesce(input->>'city', ''),
      postal_code = coalesce(input->>'postal_code', ''), country = coalesce(input->>'country', ''), currency = coalesce(input->>'currency', 'ILS'),
      subtotal = sub, discount = coalesce((input->>'discount')::numeric, 0), shipping = coalesce((input->>'shipping')::numeric, 0),
      total = sub - coalesce((input->>'discount')::numeric, 0) + coalesce((input->>'shipping')::numeric, 0),
      payment_method = coalesce(input->>'payment_method', 'other'), payment_status = coalesce(input->>'payment_status', 'unpaid'),
      status = coalesce(input->>'status', 'new'), tracking_number = coalesce(input->>'tracking_number', ''), tracking_url = coalesce(input->>'tracking_url', ''),
      receipt_number = coalesce(input->>'receipt_number', ''), receipt_url = coalesce(input->>'receipt_url', ''), notes = coalesce(input->>'notes', '')
    where id = saved_id
    returning id into saved_id;
    if saved_id is null then
      raise exception 'That order no longer exists.' using errcode = 'P0002';
    end if;
    delete from public.order_items oi where oi.order_id = saved_id;
  end if;

  insert into public.order_items (order_id, product_id, product_name, colour, size, fabric_weight, quantity, unit_price, image, sort_order)
  select saved_id, nullif(i->>'product_id', '')::bigint, i->>'product_name', coalesce(i->>'colour', ''), coalesce(i->>'size', ''),
    coalesce(i->>'fabric_weight', ''), (i->>'quantity')::integer, (i->>'unit_price')::numeric, coalesce(i->>'image', ''), (n - 1)::integer
  from jsonb_array_elements(items) with ordinality as t(i, n);
  return saved_id;
end;
$$;
revoke all on function public.admin_save_order(jsonb) from public, anon;
grant execute on function public.admin_save_order(jsonb) to authenticated;
