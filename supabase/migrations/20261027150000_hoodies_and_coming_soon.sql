-- BH Clothing: hoodie mockups like the tees, a "Pants" category, and locked "coming soon" products.
-- A coming-soon product is a real product that customers can open but not buy: the store shows its silhouette behind
-- a lock until the owner switches it off in the owner area (and adds photos and prices).

alter table public.products add column coming_soon boolean not null default false;

update public.categories set name = 'Pants' where slug = 'shorts';

-- Hoodies: new front/back mockups, no model photos.
update public.products set lookbook_images = '{}' where id = 6;
delete from public.product_colours where product_id = 6;
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (6, 'White', '#faf9f5', '/catalog/hoodies/fallen-sword/white-front.jpg', '/catalog/hoodies/fallen-sword/white-back.jpg', 0),
  (6, 'Black', '#171716', '/catalog/hoodies/fallen-sword/black-front.jpg', '/catalog/hoodies/fallen-sword/black-back.jpg', 1),
  (6, 'Gray', '#8f9190', '/catalog/hoodies/fallen-sword/gray-front.jpg', '/catalog/hoodies/fallen-sword/gray-back.jpg', 2);
update public.products set lookbook_images = '{}' where id = 7;
delete from public.product_colours where product_id = 7;
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (7, 'White', '#faf9f5', '/catalog/hoodies/oni-sword/white-front.jpg', '/catalog/hoodies/oni-sword/white-back.jpg', 0),
  (7, 'Black', '#171716', '/catalog/hoodies/oni-sword/black-front.jpg', '/catalog/hoodies/oni-sword/black-back.jpg', 1),
  (7, 'Gray', '#8f9190', '/catalog/hoodies/oni-sword/gray-front.jpg', '/catalog/hoodies/oni-sword/gray-back.jpg', 2);
update public.products set lookbook_images = '{}' where id = 8;
delete from public.product_colours where product_id = 8;
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (8, 'White', '#faf9f5', '/catalog/hoodies/oni-mask/white-front.jpg', '/catalog/hoodies/oni-mask/white-back.jpg', 0),
  (8, 'Black', '#171716', '/catalog/hoodies/oni-mask/black-front.jpg', '/catalog/hoodies/oni-mask/black-back.jpg', 1),
  (8, 'Gray', '#8f9190', '/catalog/hoodies/oni-mask/gray-front.jpg', '/catalog/hoodies/oni-mask/gray-back.jpg', 2);
update public.products set lookbook_images = '{}' where id = 9;
delete from public.product_colours where product_id = 9;
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (9, 'White', '#faf9f5', '/catalog/hoodies/rose/white-front.jpg', '/catalog/hoodies/rose/white-back.jpg', 0),
  (9, 'Black', '#171716', '/catalog/hoodies/rose/black-front.jpg', '/catalog/hoodies/rose/black-back.jpg', 1),
  (9, 'Gray', '#8f9190', '/catalog/hoodies/rose/gray-front.jpg', '/catalog/hoodies/rose/gray-back.jpg', 2);

-- Coming soon: real products shown locked with a silhouette; no prices, no stock.
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (14, 'straight-leg-pants', 'Straight Leg Pants', 'shorts', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 140);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (14, 'Black', '#171716', '/catalog/coming-soon/pants-straight.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (15, 'cargo-pants', 'Cargo Pants', 'shorts', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 150);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (15, 'Black', '#171716', '/catalog/coming-soon/pants-cargo.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (16, 'jogger-pants', 'Jogger Pants', 'shorts', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 160);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (16, 'Black', '#171716', '/catalog/coming-soon/pants-jogger.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (17, 'classic-shorts', 'Classic Shorts', 'shorts', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 170);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (17, 'Black', '#171716', '/catalog/coming-soon/shorts.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (18, 'gourmet-bracelet', 'Gourmet Bracelet', 'accessories', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 180);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (18, 'Black', '#171716', '/catalog/coming-soon/bracelet.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (19, 'gourmet-chain', 'Gourmet Chain', 'accessories', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 190);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (19, 'Black', '#171716', '/catalog/coming-soon/chain.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (20, 'bh-cap', 'BH Cap', 'accessories', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 200);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (20, 'Black', '#171716', '/catalog/coming-soon/cap.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (21, 'anime-hoodie', 'Anime Hoodie', 'anime', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 210);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (21, 'Black', '#171716', '/catalog/coming-soon/hoodie.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (22, 'anime-tee', 'Anime Tee', 'anime', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 220);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (22, 'Black', '#171716', '/catalog/coming-soon/tee.png', null, 0);
insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)
overriding system value values (23, 'anime-pants', 'Anime Pants', 'anime', 'Coming soon to BH. This piece is locked for now.', 'Coming soon', '{}'::text[], '{}'::text[], true, true, 230);
insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values
  (23, 'Black', '#171716', '/catalog/coming-soon/pants-wide.png', null, 0);

select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));

-- Saving a product now also stores the coming-soon flag (same function otherwise).
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
begin
  if not public.is_catalog_admin() then
    raise exception 'Only an authorised BH admin can change the catalogue.' using errcode = '42501';
  end if;

  if saved_id is not null then
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

  return saved_id;
end;
$$;

