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
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  insert into auth.users values ('${ADMIN}', 'owner@example.com'), ('${CUSTOMER}', 'customer@example.com');
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
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${sub}', false);`);
  try { return await run(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
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
  assert.equal((await rows('select count(*)::int as n from public.products'))[0].n, 13);
  const tees = await rows(`select product_id, weight, price_ils::float, price_usd::float, sale_price_ils::float, sale_price_usd::float, colours
    from public.product_weight_prices order by product_id, weight`);
  assert.equal(tees.length, 8);
  for (const row of tees) {
    if (row.weight === '220g') assert.deepEqual([row.price_ils, row.price_usd, row.sale_price_ils, row.sale_price_usd], [120, 38.99, 109.99, 35.99]);
    else assert.deepEqual([row.price_ils, row.price_usd, row.sale_price_ils, row.sale_price_usd], [150, 48.99, 139.99, 44.99]);
    assert.deepEqual(row.colours, row.weight === '220g' ? ['White', 'Black', 'Navy', 'Dark Gray', 'Beige', 'Light Blue', 'Camel'] : ['White', 'Black', 'Navy', 'Dark Gray', 'Beige']);
  }
  const unpriced = await rows(`select count(*)::int as n from public.products where price_ils is null and price_usd is null and fabric_weights = '{}'`);
  assert.equal(unpriced[0].n, 9);
  assert.equal((await rows('select count(*)::int as n from public.product_colours where product_id between 1 and 4'))[0].n, 28);
});

test('visitors can read the catalogue but cannot change anything', async () => {
  await as('visitor', async () => {
    assert.equal((await rows('select count(*)::int as n from public.products'))[0].n, 13);
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
    assert.ok(created > 13);
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
