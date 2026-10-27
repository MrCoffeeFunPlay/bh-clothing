-- BH Clothing: orders before a payment provider and a receipts service are connected.
-- * Orders can be marked as test orders, and every order stays "unpaid".
-- * Nobody using the website (customers or the owner) can mark an order paid or refunded, or attach a receipt: once a
--   payment provider and a receipts service are chosen, those will be set only by a server-side integration that
--   checks the provider's signed confirmation (it uses the service role, which is not available in the browser).
-- * payment_events is ready to log the provider's confirmations and refunds; nothing writes to it yet.

alter table public.orders
  add column is_test boolean not null default false,
  add column payment_provider text not null default '' check (length(payment_provider) <= 40),
  add column payment_reference text not null default '' check (length(payment_reference) <= 120),
  add column receipt_provider text not null default '' check (length(receipt_provider) <= 40);

-- Payment status, payment details and receipts may only change from the server side (service role), never from a
-- signed-in browser session, including the owner's.
create or replace function public.guard_order_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.payment_status <> 'unpaid' or new.payment_provider <> '' or new.payment_reference <> '' or new.receipt_number <> ''
         or new.receipt_url <> '' or new.receipt_provider <> '' then
        raise exception 'Payments and receipts are not connected yet: new orders stay unpaid and without a receipt.' using errcode = '42501';
      end if;
    elsif new.payment_status is distinct from old.payment_status or new.payment_provider is distinct from old.payment_provider
       or new.payment_reference is distinct from old.payment_reference or new.receipt_number is distinct from old.receipt_number
       or new.receipt_url is distinct from old.receipt_url or new.receipt_provider is distinct from old.receipt_provider then
      raise exception 'Payment status and receipts can only be set by the payment provider and receipts service.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger orders_guard_payment before insert or update on public.orders
  for each row execute function public.guard_order_payment();

-- Confirmations and refunds from the future payment provider, kept as received (written only by the server side).
create table public.payment_events (
  id bigint generated always as identity primary key,
  order_id bigint references public.orders (id) on delete set null,
  provider text not null check (length(provider) between 1 and 40),
  event_type text not null check (event_type in ('payment_confirmed', 'payment_failed', 'refund_confirmed', 'other')),
  provider_reference text not null default '' check (length(provider_reference) <= 120),
  amount numeric(10, 2),
  currency text check (currency in ('ILS', 'USD')),
  signature_verified boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
create index payment_events_order_id_idx on public.payment_events (order_id);
alter table public.payment_events enable row level security;
create policy "Admins read payment events" on public.payment_events for select to authenticated using ((select public.is_catalog_admin()));
revoke all on table public.payment_events from anon, authenticated;
grant select on table public.payment_events to authenticated;

-- The owner's save: customer, address, pieces (with the price and currency at the time of the order), discount,
-- shipping, order status, tracking, notes and the test flag. Payment and receipt fields are left as they are.
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
      subtotal, discount, shipping, total, status, tracking_number, tracking_url, notes, is_test, source)
    values (member, input->>'customer_name', wanted_email, coalesce(input->>'customer_phone', ''), coalesce(input->>'address_line', ''),
      coalesce(input->>'city', ''), coalesce(input->>'postal_code', ''), coalesce(input->>'country', ''), coalesce(input->>'currency', 'ILS'),
      sub, coalesce((input->>'discount')::numeric, 0), coalesce((input->>'shipping')::numeric, 0),
      sub - coalesce((input->>'discount')::numeric, 0) + coalesce((input->>'shipping')::numeric, 0),
      coalesce(input->>'status', 'new'), coalesce(input->>'tracking_number', ''), coalesce(input->>'tracking_url', ''),
      coalesce(input->>'notes', ''), coalesce((input->>'is_test')::boolean, true), 'manual')
    returning id into saved_id;
  else
    update public.orders set user_id = member, customer_name = input->>'customer_name', customer_email = wanted_email,
      customer_phone = coalesce(input->>'customer_phone', ''), address_line = coalesce(input->>'address_line', ''), city = coalesce(input->>'city', ''),
      postal_code = coalesce(input->>'postal_code', ''), country = coalesce(input->>'country', ''), currency = coalesce(input->>'currency', 'ILS'),
      subtotal = sub, discount = coalesce((input->>'discount')::numeric, 0), shipping = coalesce((input->>'shipping')::numeric, 0),
      total = sub - coalesce((input->>'discount')::numeric, 0) + coalesce((input->>'shipping')::numeric, 0),
      status = coalesce(input->>'status', 'new'), tracking_number = coalesce(input->>'tracking_number', ''), tracking_url = coalesce(input->>'tracking_url', ''),
      notes = coalesce(input->>'notes', ''), is_test = coalesce((input->>'is_test')::boolean, true)
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
