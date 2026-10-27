-- BH Clothing storefront core. Run after 20260904_create_bh_catalog.sql.
-- This is the source of truth for accounts, catalog, orders, receipts, coupons,
-- points, shipping, site settings and the owner dashboard.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers and owner access
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff', 'customer')) default 'customer',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- Make the first owner manually in Supabase SQL Editor after signing up:
-- update public.user_roles set role = 'admin' where user_id = 'YOUR_AUTH_USER_UUID';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text,
  phone text,
  birthday date,
  country_code text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'he')),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storefront_settings (
  id boolean primary key default true check (id),
  brand_name text not null default 'BH Clothing',
  support_email text,
  whatsapp_number text,
  points_per_currency_unit numeric(10,2) not null default 1,
  point_value_cents integer not null default 5 check (point_value_cents >= 0),
  welcome_discount_percent integer not null default 10 check (welcome_discount_percent between 1 and 100),
  default_locale text not null default 'en' check (default_locale in ('en', 'he')),
  enabled_locales text[] not null default array['en','he'],
  free_shipping_threshold_cents integer,
  updated_at timestamptz not null default now()
);
insert into public.storefront_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.storefront_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  image_path text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.storefront_categories (slug, name, description, sort_order) values
  ('tees', 'Tees', 'Original BH artwork, built for everyday.', 10),
  ('hoodies', 'Hoodies', 'Heavyweight hoodies with drawstrings and kangaroo pockets.', 20),
  ('shorts', 'Shorts', 'Relaxed fit, made to move.', 30),
  ('accessories', 'Accessories', 'Caps, bags and finishing pieces.', 40),
  ('anime', 'Anime', 'BH anime-inspired background collection.', 50)
on conflict (slug) do nothing;

-- Keep the first migration's table and extend it instead of replacing it.
alter table public.products add column if not exists category_id uuid references public.storefront_categories(id) on delete set null;
alter table public.products add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists deleted_at timestamptz;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.product_variants add column if not exists weight_gsm integer check (weight_gsm in (220, 260));
alter table public.product_variants add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.product_images add column if not exists image_type text not null default 'front' check (image_type in ('front', 'back', 'model', 'detail', 'other'));
alter table public.product_images add column if not exists colour text;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_delta integer not null,
  reason text not null check (reason in ('initial', 'sale', 'return', 'adjustment', 'damage')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Coupons and BH Points. One order has one coupon_id: promotions never stack.
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  currency text check (char_length(currency) = 3),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_redemptions integer,
  redemption_count integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  first_order_only boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (max_redemptions is null or max_redemptions > 0)
);

create table if not exists public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  source text not null check (source in ('welcome', 'admin', 'campaign', 'support')),
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (user_id, coupon_id)
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null,
  reason text not null check (reason in ('order', 'redemption', 'manual_credit', 'manual_debit', 'birthday')),
  reference_type text,
  reference_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Delivery, orders, payments and receipts.
-- Payment secrets never belong in browser code or this database migration.
-- ---------------------------------------------------------------------------
create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  countries text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  free_over_cents integer,
  min_delivery_days integer,
  max_delivery_days integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (max_delivery_days is null or min_delivery_days is null or max_delivery_days >= min_delivery_days)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  currency text not null default 'USD' check (char_length(currency) = 3),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  coupon_id uuid references public.coupons(id) on delete set null,
  shipping_rate_id uuid references public.shipping_rates(id) on delete set null,
  shipping_address jsonb,
  billing_address jsonb,
  provider text,
  provider_order_id text,
  tracking_number text,
  tracking_url text,
  placed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_order_id),
  check (discount_cents <= subtotal_cents)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  title text not null,
  sku text,
  colour text,
  size text,
  weight_gsm integer check (weight_gsm in (220, 260)),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_event_id text unique,
  status text not null,
  amount_cents integer,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  receipt_number text unique not null,
  storage_path text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FAQ and owner-managed site content.
-- ---------------------------------------------------------------------------
create table if not exists public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  question_en text not null,
  answer_en text not null,
  question_he text,
  answer_he text,
  category text not null default 'general',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.faq_entries (question_en, answer_en, question_he, answer_he, category, sort_order) values
  ('Where do you ship?', 'Available countries and final delivery price appear at checkout.', 'לאן אתם שולחים?', 'המדינות הזמינות ומחיר המשלוח הסופי מופיעים בקופה.', 'shipping', 10),
  ('Can I combine discount codes?', 'No. The checkout applies one eligible coupon only, always choosing the best valid offer for you.', 'אפשר לשלב קודי הנחה?', 'לא. בקופה מוחל קופון זכאי אחד בלבד — ההטבה התקפה הטובה ביותר ללקוח.', 'coupons', 20),
  ('How do BH Points work?', 'Points are awarded after an eligible paid order and can be used later according to the points rules.', 'איך BH Points עובדים?', 'נקודות מתקבלות לאחר הזמנה ששולמה וניתן לממש אותן לפי כללי המועדון.', 'points', 30)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Profile and welcome-coupon automation.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  welcome_coupon_id uuid;
  generated_code text;
begin
  insert into public.profiles (id, display_name, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict (user_id) do nothing;

  generated_code := 'WELCOME10-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.coupons (code, discount_type, discount_value, first_order_only)
  values (generated_code, 'percent', (select welcome_discount_percent from public.storefront_settings where id = true), true)
  returning id into welcome_coupon_id;

  insert into public.user_coupons (user_id, coupon_id, source)
  values (new.id, welcome_coupon_id, 'welcome');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS: customers only see their own data; owner/staff manage the shop.
-- ---------------------------------------------------------------------------
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.storefront_settings enable row level security;
alter table public.storefront_categories enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;
alter table public.point_ledger enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.receipts enable row level security;
alter table public.faq_entries enable row level security;

-- Replace the first migration's broad image read policy with product visibility.
drop policy if exists "Anyone can view product images" on public.product_images;
create policy "Anyone can view active product images" on public.product_images for select using (
  exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = product_variant_id and v.active and p.active)
);

create policy "Public settings read" on public.storefront_settings for select using (true);
create policy "Public active categories read" on public.storefront_categories for select using (active = true);
create policy "Public active shipping read" on public.shipping_zones for select using (active = true);
create policy "Public active rates read" on public.shipping_rates for select using (active = true);
create policy "Public active FAQs read" on public.faq_entries for select using (active = true);

create policy "Users read own profile" on public.profiles for select using (id = auth.uid());
create policy "Users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Users read own coupons" on public.user_coupons for select using (user_id = auth.uid());
create policy "Users read own points" on public.point_ledger for select using (user_id = auth.uid());
create policy "Users read own orders" on public.orders for select using (user_id = auth.uid());
create policy "Users read own order items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Users read own receipts" on public.receipts for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy "Staff manage roles" on public.user_roles for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage settings" on public.storefront_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage categories" on public.storefront_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage variants" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage images" on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage inventory" on public.inventory_movements for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage user coupons" on public.user_coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage points" on public.point_ledger for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage shipping zones" on public.shipping_zones for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage shipping rates" on public.shipping_rates for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage payment events" on public.payment_events for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage receipts" on public.receipts for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage FAQs" on public.faq_entries for all using (public.is_admin()) with check (public.is_admin());

-- User-facing updates never write orders/payments directly. Those are created by
-- a protected server endpoint after the payment provider verifies a transaction.
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists settings_updated_at on public.storefront_settings;
create trigger settings_updated_at before update on public.storefront_settings for each row execute procedure public.set_updated_at();
drop trigger if exists categories_updated_at on public.storefront_categories;
create trigger categories_updated_at before update on public.storefront_categories for each row execute procedure public.set_updated_at();
drop trigger if exists coupons_updated_at on public.coupons;
create trigger coupons_updated_at before update on public.coupons for each row execute procedure public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
drop trigger if exists faq_updated_at on public.faq_entries;
create trigger faq_updated_at before update on public.faq_entries for each row execute procedure public.set_updated_at();
