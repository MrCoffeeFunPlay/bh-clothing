-- BH Clothing: every member's bag is saved in their account (not only in the browser), so it is the same on every
-- device and is never lost. Only the pieces are saved (product, colour, size, fabric, quantity); prices are always
-- worked out from the live catalogue, so sales and price changes apply. Each member reads and changes only their own.

create table public.cart_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  colour text not null default '' check (length(colour) <= 40),
  size text not null default '' check (length(size) <= 20),
  fabric_weight text not null default '' check (length(fabric_weight) <= 20),
  quantity integer not null check (quantity between 1 and 99),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id, colour, size, fabric_weight)
);

alter table public.cart_items enable row level security;
create policy "Members read their own bag" on public.cart_items for select to authenticated using (user_id = (select auth.uid()));
create policy "Members add to their own bag" on public.cart_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members change their own bag" on public.cart_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members remove from their own bag" on public.cart_items for delete to authenticated using (user_id = (select auth.uid()));
revoke all on table public.cart_items from anon, authenticated;
grant select, insert, update, delete on table public.cart_items to authenticated;

-- Replace the member's whole bag in one step (runs with the member's own permissions).
create or replace function public.save_my_cart(lines jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to save your bag.' using errcode = '42501';
  end if;
  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) > 100 then
    raise exception 'That bag has too many pieces.' using errcode = '22023';
  end if;
  delete from public.cart_items where user_id = auth.uid();
  -- The same piece listed twice becomes one line with the quantities added up.
  insert into public.cart_items (user_id, product_id, colour, size, fabric_weight, quantity, sort_order)
  select auth.uid(), piece.product_id, piece.colour, piece.size, piece.fabric_weight, least(sum(piece.quantity), 99)::integer, (min(piece.n) - 1)::integer
  from (
    select (l->>'product_id')::bigint as product_id, coalesce(l->>'colour', '') as colour, coalesce(l->>'size', '') as size,
      coalesce(l->>'fabric_weight', '') as fabric_weight, least(greatest(coalesce((l->>'quantity')::integer, 1), 1), 99) as quantity, n
    from jsonb_array_elements(lines) with ordinality as t(l, n)
  ) piece
  group by piece.product_id, piece.colour, piece.size, piece.fabric_weight;
  return (select count(*)::integer from public.cart_items where user_id = auth.uid());
end;
$$;
revoke all on function public.save_my_cart(jsonb) from public, anon;
grant execute on function public.save_my_cart(jsonb) to authenticated;

-- Automations: "left items in the bag for X days" can now count members (bag last changed X or more days ago).
create or replace function public.admin_automation_reach(rule text, after_days integer, only_opted_in boolean default true)
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
    when 'cart_left' then (select count(*)::integer from (
                             select c.user_id from public.cart_items c group by c.user_id
                             having max(c.updated_at) < now() - make_interval(days => greatest(after_days, 0))) bags
                           left join public.profiles p on p.id = bags.user_id
                           where not only_opted_in or coalesce(p.marketing_opt_in, false))
    else null
  end;
end;
$$;
