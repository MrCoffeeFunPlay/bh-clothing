-- BH Clothing: real reviews. Only a member who bought a piece (a paid order that isn't a test) can review it, once
-- (they can edit their review). Everyone sees published reviews with the member's display name; the owner can hide one.

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (length(title) <= 80),
  body text not null check (length(trim(body)) between 2 and 1000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product on public.reviews (product_id, created_at desc);
create trigger reviews_updated_at before update on public.reviews for each row execute function public.set_updated_at();

-- Did this member buy this piece? (a paid, non-test order with it)
create or replace function public.has_bought(of_product bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.orders o join public.order_items i on i.order_id = o.id
    where o.user_id = auth.uid() and o.payment_status = 'paid' and not o.is_test and i.product_id = of_product)
$$;
revoke all on function public.has_bought(bigint) from public;
grant execute on function public.has_bought(bigint) to anon, authenticated;

alter table public.reviews enable row level security;
create policy "Everyone reads published reviews" on public.reviews for select to anon using (status = 'published');
create policy "Members read published and their own, admins all" on public.reviews for select to authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select public.is_catalog_admin()));
create policy "Buyers write one review per piece" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'published' and public.has_bought(product_id));
create policy "Members edit their own review, admins moderate" on public.reviews for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_catalog_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_catalog_admin()));
create policy "Members remove their own review, admins any" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_catalog_admin()));
revoke all on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant insert (product_id, rating, title, body), update (rating, title, body, status), delete on table public.reviews to authenticated;

-- Only the owner can hide or show a review; a member editing their own can't change its status.
create or replace function public.guard_review_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not public.is_catalog_admin() then
    raise exception 'Only BH can hide or show a review.' using errcode = '42501';
  end if;
  if new.user_id is distinct from old.user_id or new.product_id is distinct from old.product_id then
    raise exception 'A review stays with its member and piece.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger reviews_guard before update on public.reviews for each row execute function public.guard_review_status();

-- Published reviews with the member's display name (username, else first name), newest first.
create or replace function public.published_reviews(of_product bigint default null, max_rows integer default 60)
returns table (id bigint, product_id bigint, rating integer, title text, body text, created_at timestamptz, author text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.product_id, r.rating, r.title, r.body, r.created_at,
         coalesce(nullif(trim(p.username), ''), nullif(trim(p.first_name), ''), 'BH member') as author
  from public.reviews r left join public.profiles p on p.id = r.user_id
  where r.status = 'published' and (of_product is null or r.product_id = of_product)
  order by r.created_at desc
  limit least(greatest(coalesce(max_rows, 60), 1), 200)
$$;
revoke all on function public.published_reviews(bigint, integer) from public;
grant execute on function public.published_reviews(bigint, integer) to anon, authenticated;

-- Average and count per piece, for product pages and cards.
create or replace function public.review_stats()
returns table (product_id bigint, reviews integer, rating numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select r.product_id, count(*)::integer, round(avg(r.rating)::numeric, 1)
  from public.reviews r where r.status = 'published' group by r.product_id
$$;
revoke all on function public.review_stats() from public;
grant execute on function public.review_stats() to anon, authenticated;

-- The owner sees new and hidden reviews in the activity log (under FAQ & content).
create or replace function public.log_review_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  piece text := (select p.name from public.products p where p.id = coalesce(new.product_id, old.product_id));
begin
  if tg_op = 'INSERT' then perform public.write_activity('content', 'Review posted', coalesce(piece, 'A piece') || ' · ' || new.rating || '/5');
  elsif tg_op = 'DELETE' then perform public.write_activity('content', 'Review removed', coalesce(piece, 'A piece') || ' · ' || old.rating || '/5');
  elsif new.status is distinct from old.status then perform public.write_activity('content', case when new.status = 'hidden' then 'Review hidden' else 'Review shown' end, coalesce(piece, 'A piece') || ' · ' || new.rating || '/5');
  end if;
  return null;
end;
$$;
create trigger reviews_activity after insert or update or delete on public.reviews for each row execute function public.log_review_activity();
