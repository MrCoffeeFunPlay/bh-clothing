// Runs the Supabase migrations in a local Postgres (PGlite) with minimal stand-ins for Supabase's auth and storage
// schemas, then checks what visitors, signed-in customers and admins can and cannot do.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ADMIN = '00000000-0000-4000-8000-000000000001';
const CUSTOMER = '00000000-0000-4000-8000-000000000002';

const supabaseStandIns = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, phone_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid(), auth.role() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  insert into auth.users (id, email) values ('${ADMIN}', 'owner@example.com'), ('${CUSTOMER}', 'customer@example.com');
`;

const db = new PGlite();
await db.exec(supabaseStandIns);
for (const file of readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
}
// The owner is made an admin exactly as the setup instructions say (SQL editor, as the database owner).
await db.exec(`insert into public.catalog_admins (user_id, note) select id, 'owner' from auth.users where email = 'owner@example.com'`);

async function as(who, run) {
  const role = who === 'visitor' ? 'anon' : 'authenticated';
  const sub = who === 'admin' ? ADMIN : who === 'customer' ? CUSTOMER : '';
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub}', false); select set_config('request.jwt.claim.role', '${role}', false);`);
  try { return await run(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claim.role', '', false);`); }
}
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const teePrice = async () => (await rows(`select price_ils from public.product_weight_prices where product_id = 1 and weight = '220g'`))[0].price_ils;
const tee = (extra = {}) => ({
  id: 1, name: 'Fallen Sword', category_slug: 'tees', description: 'd', sizes: ['S', 'M'], fabric_weights: ['220g'],
  colours: [{ name: 'Black', hex: '#1c1c1c', front_image: '/catalog/tees/fallen-sword/black-front.jpg', back_image: '/catalog/tees/fallen-sword/black-back.jpg' }],
  weight_prices: [{ weight: '220g', price_ils: 120, price_usd: 38.99, sale_price_ils: 109.99, sale_price_usd: 35.99, colours: ['Black'] }],
  ...extra,
});

test('the seed copies the live catalogue unchanged, without stock or invented prices', async () => {
  assert.equal((await rows('select count(*)::int as n from public.categories'))[0].n, 5);
  assert.equal((await rows('select count(*)::int as n from public.products'))[0].n, 23);
  assert.equal((await rows('select count(*)::int as n from public.products where coming_soon'))[0].n, 16);
  // Only the tees and Loose Shorts can be bought; the cap and bag are hidden.
  assert.deepEqual((await rows('select id from public.products where active and not coming_soon order by id')).map(r => r.id), [1, 2, 3, 4, 5]);
  assert.deepEqual((await rows('select slug from public.products where not active order by id')).map(r => r.slug), ['bh-washed-cap', 'bh-crossbody']);
  assert.equal((await rows(`select name from public.categories where slug = 'shorts'`))[0].name, 'Pants');
  assert.equal((await rows(`select count(*)::int as n from public.product_colours where product_id between 6 and 9 and front_image like '/catalog/hoodies/%/%-front.jpg' and back_image like '%-back.jpg'`))[0].n, 12);
  assert.equal((await rows(`select count(*)::int as n from public.products where cardinality(lookbook_images) > 0`))[0].n, 0);
  const tees = await rows(`select product_id, weight, price_ils::float, price_usd::float, sale_price_ils::float, sale_price_usd::float, colours
    from public.product_weight_prices order by product_id, weight`);
  assert.equal(tees.length, 8);
  for (const row of tees) {
    if (row.weight === '220g') assert.deepEqual([row.price_ils, row.price_usd, row.sale_price_ils, row.sale_price_usd], [120, 38.99, 109.99, 35.99]);
    else assert.deepEqual([row.price_ils, row.price_usd, row.sale_price_ils, row.sale_price_usd], [150, 48.99, 139.99, 44.99]);
    assert.deepEqual(row.colours, row.weight === '220g' ? ['White', 'Black', 'Navy', 'Dark Gray', 'Beige', 'Light Blue', 'Camel'] : ['White', 'Black', 'Navy', 'Dark Gray', 'Beige']);
  }
  const unpriced = await rows(`select count(*)::int as n from public.products where price_ils is null and price_usd is null and fabric_weights = '{}'`);
  assert.equal(unpriced[0].n, 19);
  assert.equal((await rows('select count(*)::int as n from public.product_colours where product_id between 1 and 4'))[0].n, 28);
});

test('visitors can read the catalogue but cannot change anything', async () => {
  await as('visitor', async () => {
    assert.equal((await rows('select count(*)::int as n from public.products'))[0].n, 21);
    await assert.rejects(db.query(`update public.product_weight_prices set price_ils = 1 where product_id = 1`), /permission denied/);
    await assert.rejects(db.query(`insert into public.products (slug, name, category_slug) values ('x', 'X', 'tees')`), /permission denied/);
    await assert.rejects(db.query(`delete from public.products where id = 1`), /permission denied/);
    await assert.rejects(db.query(`select public.admin_save_product($1)`, [tee()]), /permission denied/);
    await assert.rejects(db.query(`insert into public.catalog_admins (user_id) values ('${CUSTOMER}')`), /permission denied/);
    await assert.rejects(db.query(`insert into storage.objects (bucket_id, name) values ('product-images', 'x.jpg')`), /row-level security/);
  });
  assert.equal(await teePrice(), '120.00');
});

test('signed-in customers cannot change the catalogue or make themselves admin', async () => {
  await as('customer', async () => {
    const updated = await db.query(`update public.product_weight_prices set price_ils = 1 where product_id = 1`);
    assert.equal(updated.affectedRows, 0);
    await assert.rejects(db.query(`insert into public.products (slug, name, category_slug) values ('x', 'X', 'tees')`), /row-level security/);
    await assert.rejects(db.query(`select public.admin_save_product($1)`, [tee()]), /Only an authorised BH admin/);
    await assert.rejects(db.query(`insert into public.catalog_admins (user_id) values ('${CUSTOMER}')`), /permission denied/);
    assert.equal((await rows('select public.is_catalog_admin() as admin'))[0].admin, false);
    await assert.rejects(db.query(`insert into storage.objects (bucket_id, name) values ('product-images', 'x.jpg')`), /row-level security/);
  });
  assert.equal(await teePrice(), '120.00');
});

test('an admin can save, hide and create products in one transaction, with validation', async () => {
  await as('admin', async () => {
    assert.equal((await rows('select public.is_catalog_admin() as admin'))[0].admin, true);
    await db.query(`select public.admin_save_product($1)`, [tee({ weight_prices: [{ weight: '220g', price_ils: 125, price_usd: 39.99, sale_price_ils: 109.99, sale_price_usd: 35.99, colours: ['Black'] }] })]);
    // invalid saves change nothing
    await assert.rejects(db.query(`select public.admin_save_product($1)`, [tee({ weight_prices: [{ weight: '220g', price_ils: 100, sale_price_ils: 109.99, colours: ['Black'] }] })]), /check constraint/);
    await assert.rejects(db.query(`select public.admin_save_product($1)`, [tee({ weight_prices: [{ weight: '220g', price_ils: 120, colours: ['Purple'] }] })]), /colour that the product does not have/);
    await assert.rejects(db.query(`select public.admin_save_product($1)`, [tee({ colours: [] })]), /at least one colour/);
    const created = (await rows(`select public.admin_save_product($1) as id`, [tee({ id: null, name: 'New Tee', active: false })]))[0].id;
    assert.ok(created > 23);
    // unlocking / locking a coming-soon product
    await db.query(`select public.admin_save_product($1)`, [tee({ id: created, name: 'New Tee', active: false, coming_soon: true })]);
    assert.equal((await rows('select coming_soon from public.products where id = $1', [created]))[0].coming_soon, true);
    assert.equal((await rows('select slug from public.products where id = $1', [created]))[0].slug, 'new-tee');
    await db.query(`insert into storage.objects (bucket_id, name) values ('product-images', 'tees/new.jpg')`);
    await assert.rejects(db.query(`insert into public.catalog_admins (user_id) values ('${CUSTOMER}')`), /permission denied/);
  });
  const saved = (await rows(`select price_ils::float, price_usd::float from public.product_weight_prices where product_id = 1`))[0];
  assert.deepEqual(saved, { price_ils: 125, price_usd: 39.99 });
  assert.equal((await rows('select count(*)::int as n from public.product_colours where product_id = 1'))[0].n, 1);
  // a hidden product is invisible to visitors but still visible to the admin
  await as('visitor', async () => assert.equal((await rows(`select count(*)::int as n from public.products where name = 'New Tee'`))[0].n, 0));
  await as('admin', async () => assert.equal((await rows(`select count(*)::int as n from public.products where name = 'New Tee'`))[0].n, 1));
});

test('customers can only read and change their own profile; visitors see no profiles', async () => {
  await as('customer', async () => {
    await db.query(`insert into public.profiles (id, first_name, username, birthday, country) values ('${CUSTOMER}', 'Noa', 'noa', '1995-04-02', 'Israel')`);
    await db.query(`update public.profiles set last_name = 'Levi' where id = '${CUSTOMER}'`);
    assert.equal((await rows('select count(*)::int as n from public.profiles'))[0].n, 1);
    await assert.rejects(db.query(`insert into public.profiles (id, first_name) values ('${ADMIN}', 'Not me')`), /row-level security/);
    await assert.rejects(db.query(`delete from public.profiles where id = '${CUSTOMER}'`), /permission denied/);
  });
  await as('admin', async () => {
    await db.query(`insert into public.profiles (id, first_name) values ('${ADMIN}', 'Owner')`);
    const seen = await rows('select id, first_name from public.profiles');
    assert.deepEqual(seen.map(row => row.first_name), ['Owner'], 'even an admin only sees their own profile');
    const changed = await db.query(`update public.profiles set first_name = 'x' where id = '${CUSTOMER}'`);
    assert.equal(changed.affectedRows, 0);
  });
  await as('visitor', async () => {
    await assert.rejects(db.query('select * from public.profiles'), /permission denied/);
  });
  const customer = (await rows(`select first_name, last_name, username, country from public.profiles where id = '${CUSTOMER}'`))[0];
  assert.deepEqual(customer, { first_name: 'Noa', last_name: 'Levi', username: 'noa', country: 'Israel' });
});

test('tags: everyone can read them, only admins create, edit, delete and give them', async () => {
  await as('visitor', async () => {
    assert.deepEqual((await rows('select name from public.tags order by sort_order')).map(r => r.name), ['Verified', 'Top Buyer', 'BH Core', 'BH Plus', 'BH Black']);
    await assert.rejects(db.query(`insert into public.tags (name) values ('Hacker')`), /permission denied/);
  });
  await as('customer', async () => {
    await assert.rejects(db.query(`insert into public.tags (name) values ('Hacker')`), /row-level security/);
    await assert.rejects(db.query(`insert into public.user_tags (user_id, tag_id) select '${CUSTOMER}', id from public.tags where name = 'Top Buyer'`), /row-level security/);
    assert.equal((await db.query(`update public.tags set name = 'X' where name = 'Top Buyer'`)).affectedRows, 0);
    assert.equal((await db.query(`delete from public.tags`)).affectedRows, 0);
    await assert.rejects(db.query(`select * from public.admin_find_members('')`), /not authorised/);
  });
  await as('admin', async () => {
    const id = (await rows(`insert into public.tags (name, icon, colour) values ('Early Supporter', 'heart', '#c0392b') returning id`))[0].id;
    await db.query(`update public.tags set description = 'Here from day one.' where id = $1`, [id]);
    await assert.rejects(db.query(`insert into public.tags (name, colour) values ('Bad colour', 'red')`), /check constraint/);
    await db.query(`insert into public.user_tags (user_id, tag_id) values ('${CUSTOMER}', $1), ('${ADMIN}', $1)`, [id]);
    const found = await rows(`select email, tag_ids from public.admin_find_members('customer')`);
    assert.deepEqual(found.map(r => [r.email, r.tag_ids.map(Number)]), [['customer@example.com', [Number(id)]]]);
  });
  await as('customer', async () => {
    // A member sees only their own tags.
    assert.deepEqual((await rows(`select t.name from public.user_tags ut join public.tags t on t.id = ut.tag_id`)).map(r => r.name), ['Early Supporter']);
  });
  await as('admin', async () => {
    await db.query(`delete from public.tags where name = 'Early Supporter'`);
    assert.equal((await rows('select count(*)::int as n from public.user_tags'))[0].n, 0, 'deleting a tag removes it from everyone');
  });
});

test('phone verification gives the Verified tag once the phone is confirmed', async () => {
  await as('customer', async () => {
    assert.equal((await rows('select public.claim_phone_tags() as n'))[0].n, 0, 'no tag before the phone is confirmed');
  });
  await db.query(`update auth.users set phone_confirmed_at = now() where id = '${CUSTOMER}'`);
  await as('customer', async () => {
    assert.equal((await rows('select public.claim_phone_tags() as n'))[0].n, 1);
    assert.equal((await rows('select public.claim_phone_tags() as n'))[0].n, 0, 'only once');
    assert.deepEqual((await rows(`select t.name from public.user_tags ut join public.tags t on t.id = ut.tag_id`)).map(r => r.name), ['Verified']);
  });
  await as('visitor', async () => {
    await assert.rejects(db.query('select public.claim_phone_tags()'), /permission denied/);
  });
});

test('profile pictures: members upload only into their own folder', async () => {
  await as('customer', async () => {
    await db.query(`insert into storage.objects (bucket_id, name) values ('avatars', '${CUSTOMER}/me.jpg')`);
    await assert.rejects(db.query(`insert into storage.objects (bucket_id, name) values ('avatars', '${ADMIN}/me.jpg')`), /row-level security/);
    await assert.rejects(db.query(`insert into storage.objects (bucket_id, name) values ('avatars', 'me.jpg')`), /row-level security/);
    await db.query(`insert into public.profiles (id, avatar_url) values ('${CUSTOMER}', 'https://x.supabase.co/storage/v1/object/public/avatars/${CUSTOMER}/me.jpg') on conflict (id) do update set avatar_url = excluded.avatar_url`);
  });
  await as('visitor', async () => {
    await assert.rejects(db.query(`insert into storage.objects (bucket_id, name) values ('avatars', 'x/me.jpg')`), /row-level security/);
  });
});

test('automations: only admins can see and change them; reach counts members who match today', async () => {
  for (const who of ['visitor', 'customer']) {
    await as(who, async () => {
      if (who === 'visitor') await assert.rejects(db.query('select * from public.automations'), /permission denied/);
      else assert.equal((await rows('select count(*)::int as n from public.automations'))[0].n, 0, 'customers see no automations');
      await assert.rejects(db.query(`select public.admin_automation_reach('no_sign_in', 30, true)`), /permission denied|not authorised/);
    });
  }
  await as('customer', async () => {
    await assert.rejects(db.query(`insert into public.automations (name, trigger, subject, body) values ('x', 'welcome', 's', 'b')`), /row-level security/);
  });
  await db.query(`update auth.users set last_sign_in_at = now() - interval '40 days' where id = '${CUSTOMER}'`);
  await db.query(`update auth.users set last_sign_in_at = now() - interval '2 days' where id = '${ADMIN}'`);
  await as('admin', async () => {
    assert.deepEqual((await rows('select trigger from public.automations order by id')).map(r => r.trigger), ['welcome', 'no_sign_in', 'no_order', 'birthday', 'cart_left']);
    assert.equal((await rows('select count(*)::int as n from public.automations where active'))[0].n, 0, 'nothing is switched on by default');
    // Marketing automations only count members who chose to get BH updates.
    assert.equal((await rows(`select public.admin_automation_reach('no_sign_in', 30, false) as n`))[0].n, 1);
    assert.equal((await rows(`select public.admin_automation_reach('no_sign_in', 1, false) as n`))[0].n, 2);
    assert.equal((await rows(`select public.admin_automation_reach('no_sign_in', 1) as n`))[0].n, 0, 'nobody opted in yet');
    assert.equal((await rows(`select public.admin_automation_reach('no_order', 30) as n`))[0].n, null);
    assert.deepEqual((await rows(`select trigger, marketing from public.automations where trigger in ('welcome', 'birthday') order by id`)).map(r => [r.trigger, r.marketing]), [['welcome', false], ['birthday', true]]);
    const id = (await rows(`insert into public.automations (name, trigger, days, subject, body) values ('Test', 'no_sign_in', 14, 'Hi {first_name}', 'Body') returning id`))[0].id;
    await db.query(`update public.automations set active = true, days = 21 where id = $1`, [id]);
    await assert.rejects(db.query(`update public.automations set days = 999 where id = $1`, [id]), /check constraint/);
    await assert.rejects(db.query(`update public.automations set trigger = 'spam_everyone' where id = $1`, [id]), /check constraint/);
    await db.query(`delete from public.automations where id = $1`, [id]);
  });
});

test('BH updates: members choose; the database records when they said yes and the reach respects it', async () => {
  await as('customer', async () => {
    await db.query(`insert into public.profiles (id, marketing_opt_in, marketing_opt_in_at) values ('${CUSTOMER}', false, '2000-01-01') on conflict (id) do update set marketing_opt_in = false, marketing_opt_in_at = '2000-01-01'`);
    assert.equal((await rows(`select marketing_opt_in_at from public.profiles where id = '${CUSTOMER}'`))[0].marketing_opt_in_at, null, 'no consent time without a yes, and it cannot be invented');
    await db.query(`update public.profiles set marketing_opt_in = true where id = '${CUSTOMER}'`);
    const first = (await rows(`select marketing_opt_in_at from public.profiles where id = '${CUSTOMER}'`))[0].marketing_opt_in_at;
    assert.ok(first && Date.now() - new Date(first).getTime() < 60_000, 'consent time is now');
    await db.query(`update public.profiles set first_name = 'Noa', marketing_opt_in_at = '2000-01-01' where id = '${CUSTOMER}'`);
    assert.equal((await rows(`select marketing_opt_in_at from public.profiles where id = '${CUSTOMER}'`))[0].marketing_opt_in_at.getTime(), first.getTime(), 'kept while updates stay on');
  });
  await as('admin', async () => {
    assert.equal((await rows(`select public.admin_automation_reach('no_sign_in', 1) as n`))[0].n, 1, 'only the member who opted in');
  });
  await as('customer', async () => {
    await db.query(`update public.profiles set marketing_opt_in = false where id = '${CUSTOMER}'`);
    assert.equal((await rows(`select marketing_opt_in_at from public.profiles where id = '${CUSTOMER}'`))[0].marketing_opt_in_at, null);
  });
  await as('admin', async () => {
    assert.equal((await rows(`select public.admin_automation_reach('no_sign_in', 1) as n`))[0].n, 0, 'switching off stops marketing');
  });
});

test('orders: admins record them (totals worked out by the database), members see only their own', async () => {
  const order = (extra = {}) => ({
    customer_name: 'Noa Levi', customer_email: 'Customer@Example.com', currency: 'ILS', discount: 10, shipping: 25, status: 'new', is_test: true,
    items: [
      { product_id: 1, product_name: 'Fallen Sword', colour: 'Black', size: 'M', fabric_weight: '220g', quantity: 2, unit_price: 109.99 },
      { product_id: 5, product_name: 'Loose Shorts', colour: 'Black', size: 'L', quantity: 1, unit_price: 80 },
    ],
    subtotal: 1, total: 1, payment_status: 'paid', receipt_number: 'FAKE', receipt_url: 'https://fake', // all ignored by the database
    ...extra,
  });
  await as('customer', async () => {
    await assert.rejects(db.query(`select public.admin_save_order($1)`, [order()]), /Only an authorised BH admin/);
    await assert.rejects(db.query(`insert into public.orders (customer_name) values ('x')`), /permission denied/);
  });
  await as('visitor', async () => {
    await assert.rejects(db.query(`select * from public.orders`), /permission denied/);
    await assert.rejects(db.query(`select public.admin_save_order($1)`, [order()]), /permission denied/);
  });
  let id;
  await as('admin', async () => {
    id = Number((await rows(`select public.admin_save_order($1) as id`, [order()]))[0].id);
    const [saved] = await rows(`select order_number, user_id, customer_email, subtotal::float, total::float, payment_status, paid_at, receipt_number, receipt_url, is_test, source from public.orders where id = $1`, [id]);
    assert.equal(saved.order_number, 'BH-' + String(id).padStart(5, '0'));
    assert.equal(saved.user_id, CUSTOMER, 'linked to the member with the same email');
    assert.equal(saved.customer_email, 'customer@example.com');
    assert.deepEqual([saved.subtotal, saved.total], [299.98, 314.98], 'totals worked out from the items, not taken from the browser');
    assert.deepEqual([saved.payment_status, saved.paid_at, saved.receipt_number, saved.receipt_url], ['unpaid', null, '', ''], 'stays unpaid, no receipt');
    assert.equal(saved.is_test, true); assert.equal(saved.source, 'manual');
    assert.deepEqual((await rows(`select product_name, colour, size, fabric_weight, quantity, unit_price::float from public.order_items where order_id = $1 order by sort_order`, [id])).map(Object.values),
      [['Fallen Sword', 'Black', 'M', '220g', 2, 109.99], ['Loose Shorts', 'Black', 'L', '', 1, 80]], 'pieces and prices at the time of the order');
    // Update: ship it and change the items.
    await db.query(`select public.admin_save_order($1)`, [order({ id, status: 'shipped', tracking_number: 'RR123IL', items: [{ product_name: 'Rose', quantity: 1, unit_price: 120 }] })]);
    const [updated] = await rows(`select status, total::float, shipped_at, payment_status from public.orders where id = $1`, [id]);
    assert.equal(updated.status, 'shipped'); assert.equal(updated.total, 135); assert.ok(updated.shipped_at); assert.equal(updated.payment_status, 'unpaid');
    // Even the owner cannot mark an order paid or attach a receipt from the website: that is for the payment provider.
    await assert.rejects(db.query(`update public.orders set payment_status = 'paid' where id = $1`, [id]), /permission denied|payment provider/);
    await assert.rejects(db.query(`select * from public.payment_events`).then(() => db.query(`insert into public.payment_events (provider, event_type) values ('x', 'payment_confirmed')`)), /permission denied/);
    await assert.rejects(db.query(`select public.admin_save_order($1)`, [order({ items: [] })]), /at least one item/);
    await assert.rejects(db.query(`select public.admin_save_order($1)`, [order({ discount: 1000 })]), /check constraint/);
    await assert.rejects(db.query(`select public.admin_save_order($1)`, [order({ status: 'lost' })]), /check constraint/);
    await assert.rejects(db.query(`select public.admin_save_order($1)`, [order({ id: 999999 })]), /no longer exists/);
    await db.query(`select public.admin_save_order($1)`, [order({ customer_email: 'someone@else.com', customer_name: 'Guest' })]);
  });
  await as('customer', async () => {
    assert.deepEqual((await rows(`select customer_name from public.orders`)).map(r => r.customer_name), ['Noa Levi'], 'only their own order');
    assert.equal((await rows(`select count(*)::int as n from public.order_items`))[0].n, 1);
    await assert.rejects(db.query(`update public.orders set total = 0`), /permission denied/, 'members cannot change prices');
    await assert.rejects(db.query(`update public.orders set payment_status = 'paid'`), /permission denied/, 'members cannot mark orders paid');
    await assert.rejects(db.query(`update public.order_items set unit_price = 1`), /permission denied/);
    assert.equal((await rows(`select count(*)::int as n from public.payment_events`))[0].n, 0, 'members see no payment records');
    await assert.rejects(db.query(`insert into public.payment_events (provider, event_type) values ('x', 'payment_confirmed')`), /permission denied/);
  });
  // The future server-side integration (service role, outside the browser) is the only way to record a payment.
  await db.query(`update public.orders set payment_status = 'paid', payment_provider = 'provider', payment_reference = 'tx-1' where id = $1`, [id]);
  assert.ok((await rows(`select paid_at from public.orders where id = $1`, [id]))[0].paid_at);
});

test('saved bags: each member keeps their own bag in their account; prices are never stored', async () => {
  const lines = [
    { product_id: 1, colour: 'Black', size: 'M', fabric_weight: '220g', quantity: 2 },
    { product_id: 5, colour: 'Black', size: 'L', quantity: 1, unit_price: 0.01 },
    { product_id: 1, colour: 'Black', size: 'M', fabric_weight: '220g', quantity: 1 }, // same piece again: quantities add up
  ];
  await as('visitor', async () => {
    await assert.rejects(db.query(`select public.save_my_cart($1)`, [JSON.stringify(lines)]), /permission denied/);
    await assert.rejects(db.query(`select * from public.cart_items`), /permission denied/);
  });
  await as('customer', async () => {
    assert.equal((await rows(`select public.save_my_cart($1) as n`, [JSON.stringify(lines)]))[0].n, 2);
    assert.deepEqual((await rows(`select product_id::int, colour, size, fabric_weight, quantity from public.cart_items order by sort_order`)).map(Object.values),
      [[1, 'Black', 'M', '220g', 3], [5, 'Black', 'L', '', 1]]);
    assert.ok(!(await rows(`select column_name from information_schema.columns where table_name = 'cart_items'`)).some(r => /price/.test(r.column_name)), 'no prices in the bag');
    await assert.rejects(db.query(`insert into public.cart_items (user_id, product_id, quantity) values ('${ADMIN}', 1, 1)`), /row-level security/, 'cannot fill someone else\'s bag');
    await assert.rejects(db.query(`select public.save_my_cart($1)`, [JSON.stringify([{ product_id: 1, quantity: 1, colour: 'x'.repeat(50) }])]), /check constraint/);
  });
  await as('admin', async () => {
    await db.query(`select public.save_my_cart($1)`, [JSON.stringify([{ product_id: 2, colour: 'White', size: 'S', fabric_weight: '220g', quantity: 1 }])]);
    assert.deepEqual((await rows(`select product_id::int from public.cart_items`)).map(r => r.product_id), [2], 'even an admin sees only their own bag');
  });
  await as('customer', async () => {
    assert.equal((await rows(`select count(*)::int as n from public.cart_items`))[0].n, 2, 'other members cannot see or change it');
    assert.equal((await rows(`select public.save_my_cart('[]') as n`))[0].n, 0, 'emptying the bag');
    await db.query(`select public.save_my_cart($1)`, [JSON.stringify([{ product_id: 3, colour: 'Black', size: 'M', fabric_weight: '220g', quantity: 1 }])]);
  });
  // Abandoned bags: the automation counts bags untouched for X days (only members with updates on).
  await db.query(`update public.cart_items set updated_at = now() - interval '3 days' where user_id = '${CUSTOMER}'`);
  await db.query(`update public.profiles set marketing_opt_in = true where id = '${CUSTOMER}'`);
  await as('admin', async () => {
    assert.equal((await rows(`select public.admin_automation_reach('cart_left', 1, false) as n`))[0].n, 1);
    assert.equal((await rows(`select public.admin_automation_reach('cart_left', 1, true) as n`))[0].n, 1);
    assert.equal((await rows(`select public.admin_automation_reach('cart_left', 5, false) as n`))[0].n, 0);
  });
});
