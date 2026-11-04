-- BH Clothing: checkout.
--   * Coupon codes are checked by the database (dates, total uses, uses per customer, currency), never in the browser.
--     Checking a code doesn't use it up: a use is counted only when a paid order carries it (once payments open).
--   * Orders remember which coupon they used.
--   * Members can save their delivery details for next time (only they can read or change them).

alter table public.orders add column coupon_code text not null default '' check (length(coupon_code) <= 30);

alter table public.profiles add column delivery jsonb not null default '{}'::jsonb
  check (jsonb_typeof(delivery) = 'object' and pg_column_size(delivery) <= 2000);

-- Is this code valid for this bag right now? Returns { ok, reason, code, kind, amount, currency, discount, starts_at }.
-- reason (when not ok): unknown, paused, not_started, ended, used_up, sign_in, already_used, currency.
create or replace function public.check_coupon(wanted text, bag_currency text, bag_subtotal numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.coupons;
  used integer;
  discount numeric;
begin
  select * into c from public.coupons where code = upper(trim(coalesce(wanted, '')));
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;
  if not c.active then return jsonb_build_object('ok', false, 'reason', 'paused', 'code', c.code); end if;
  if c.starts_at is not null and c.starts_at > now() then return jsonb_build_object('ok', false, 'reason', 'not_started', 'code', c.code, 'starts_at', c.starts_at); end if;
  if c.expires_at is not null and c.expires_at <= now() then return jsonb_build_object('ok', false, 'reason', 'ended', 'code', c.code); end if;
  if c.max_uses is not null and c.times_used >= c.max_uses then return jsonb_build_object('ok', false, 'reason', 'used_up', 'code', c.code); end if;
  if c.per_customer_limit is not null then
    if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'sign_in', 'code', c.code); end if;
    select count(*)::integer into used from public.orders o
      where o.user_id = auth.uid() and o.coupon_code = c.code and o.payment_status = 'paid' and not o.is_test;
    if used >= c.per_customer_limit then return jsonb_build_object('ok', false, 'reason', 'already_used', 'code', c.code); end if;
  end if;
  if c.kind = 'fixed' and c.currency <> bag_currency then
    return jsonb_build_object('ok', false, 'reason', 'currency', 'code', c.code, 'currency', c.currency);
  end if;
  discount := case when c.kind = 'percent' then round(greatest(bag_subtotal, 0) * c.amount / 100, 2) else least(c.amount, greatest(bag_subtotal, 0)) end;
  return jsonb_build_object('ok', true, 'code', c.code, 'kind', c.kind, 'amount', c.amount, 'currency', c.currency, 'discount', discount);
end;
$$;
revoke all on function public.check_coupon(text, text, numeric) from public;
grant execute on function public.check_coupon(text, text, numeric) to anon, authenticated;
