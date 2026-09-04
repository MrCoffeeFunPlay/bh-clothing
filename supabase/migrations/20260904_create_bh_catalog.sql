-- BH Clothing product catalogue. Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  active boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique,
  colour text not null,
  size text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

create policy "Anyone can view active products" on public.products
  for select using (active = true);
create policy "Anyone can view active variants" on public.product_variants
  for select using (active = true);
create policy "Anyone can view product images" on public.product_images
  for select using (true);

-- Writes are intentionally not available from the storefront browser.
-- They will be performed by a secured owner/admin server action in the next phase.
