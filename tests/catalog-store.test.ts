import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../src/catalog.ts';
import { productAmount, productOriginalAmount } from '../src/pricing.ts';
import { CatalogError, configureCatalogBackend, currentSession, fetchCatalog, productFromRow, productToPayload, saveProduct, type CategoryRow, type ProductRow } from '../src/catalogStore.ts';

const categories: CategoryRow[] = ['Tees', 'Hoodies', 'Shorts', 'Accessories', 'Anime'].map((name, index) => ({ slug: name.toLowerCase(), name, description: '', image_path: null, sort_order: index, active: true }));
// What PostgREST returns for a product saved with admin_save_product (numeric columns may arrive as strings).
const rowFrom = (payload: ReturnType<typeof productToPayload>, id: number, numbersAsText = false): ProductRow => {
  const money = (value: number | null) => value === null ? null : numbersAsText ? value.toFixed(2) : value;
  return {
    id, slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: payload.name, category_slug: payload.category_slug, description: payload.description,
    tag: payload.tag || null, sizes: payload.sizes, fabric_weights: payload.fabric_weights, price_ils: money(payload.price_ils), price_usd: money(payload.price_usd),
    lookbook_images: payload.lookbook_images, sale_enabled: payload.sale_enabled, sale_title: payload.sale_title, sale_kind: payload.sale_kind,
    sale_value: payload.sale_value, sale_currency: payload.sale_currency, sale_starts_at: payload.sale_starts_at, sale_ends_at: payload.sale_ends_at,
    active: payload.active, sort_order: id,
    product_colours: payload.colours.map((colour, index) => ({ ...colour, sort_order: index })).reverse(),
    product_weight_prices: payload.weight_prices.map(price => ({ ...price, price_ils: money(price.price_ils), price_usd: money(price.price_usd), sale_price_ils: money(price.sale_price_ils), sale_price_usd: money(price.sale_price_usd) })),
  };
};

test('every product survives the trip to the database and back unchanged', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  for (const numbersAsText of [false, true]) {
    for (const original of products) {
      const live = productFromRow(rowFrom(productToPayload(original, categories), original.id, numbersAsText), categories);
      for (const key of ['name', 'category', 'description', 'sizes', 'image', 'colorImages', 'backImages', 'colorHexes', 'lookbookImages'] as const) {
        assert.deepEqual(live[key], original[key], `${original.name}: ${key}`);
      }
      assert.deepEqual(live.cottonWeights, original.cottonWeights ?? []);
      for (const weight of original.cottonWeights?.length ? original.cottonWeights : [undefined]) {
        for (const currency of ['ILS', 'USD'] as const) {
          assert.equal(productOriginalAmount(live, currency, weight), productOriginalAmount(original, currency, weight), `${original.name} ${weight} ${currency}`);
          assert.equal(productAmount(live, currency, weight, now), productAmount(original, currency, weight, now), `${original.name} ${weight} ${currency} sale`);
        }
      }
      if (original.weightColors) assert.deepEqual(live.weightColors, original.weightColors);
    }
  }
  const tee = productFromRow(rowFrom(productToPayload(products[0], categories), 1), categories);
  assert.deepEqual(tee.weightColors?.['260g'], ['White', 'Black', 'Navy', 'Dark Gray', 'Beige']);
  assert.equal(productAmount(tee, 'USD', '260g'), 44.99);
  // products without a price stay unpublished
  const shorts = productFromRow(rowFrom(productToPayload(products[4], categories), 5), categories);
  assert.equal(productAmount(shorts, 'ILS'), null);
  assert.equal(productAmount(shorts, 'USD'), null);
});

test('a timed product sale and the hidden flag are stored and read back', () => {
  const sale = { enabled: true, title: 'Weekend', kind: 'percent' as const, value: 20, currency: 'ILS' as const, startsAt: '2026-11-01T00:00:00.000Z', endsAt: '2026-11-03T00:00:00.000Z' };
  const payload = productToPayload({ ...products[1], sale, active: false }, categories);
  assert.equal(payload.sale_enabled, true); assert.equal(payload.sale_value, 20); assert.equal(payload.active, false);
  assert.equal(payload.id, null, 'built-in products without a database id are created, not updated');
  const live = productFromRow(rowFrom(payload, 2), categories);
  assert.deepEqual(live.sale, sale);
  assert.equal(live.active, false);
  assert.equal(productAmount(live, 'ILS', '220g', Date.parse('2026-11-02T00:00:00Z')), 96);
  assert.equal(productToPayload(live, categories).id, 2);
});

type Call = { url: string; init: RequestInit };
function mockFetch(answer: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => { calls.push({ url, init }); return answer({ url, init }); }) as typeof fetch;
  return calls;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('loading the catalogue: success, unreachable database and server errors', async () => {
  configureCatalogBackend({ url: 'https://example.supabase.co', key: 'sb_publishable_test' });
  const row = rowFrom(productToPayload(products[0], categories), 1);
  const calls = mockFetch(({ url }) => json(url.includes('/categories') ? categories : [row]));
  const { products: loaded } = await fetchCatalog();
  assert.equal(loaded[0].name, 'Fallen Sword');
  assert.equal((calls[0].init.headers as Record<string, string>).apikey, 'sb_publishable_test');
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, undefined, 'visitors send no user token');

  mockFetch(() => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(fetchCatalog(), (error: unknown) => error instanceof CatalogError && /could not be reached/.test(error.message));
  mockFetch(() => json({ message: 'boom' }, 500));
  await assert.rejects(fetchCatalog(), /boom/);
});

test('saving sends the admin token to the database and reports refusals clearly', async () => {
  configureCatalogBackend({ url: 'https://example.supabase.co', key: 'sb_publishable_test' });
  const calls = mockFetch(() => json(1));
  assert.equal(await saveProduct(productToPayload(products[0], categories), 'admin-token'), 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/admin_save_product$/);
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer admin-token');
  assert.equal(JSON.parse(String(calls[0].init.body)).product.weight_prices[1].sale_price_usd, 44.99);
  mockFetch(() => json({ code: '42501', message: 'Only an authorised BH admin can change the catalogue.' }, 403));
  await assert.rejects(saveProduct(productToPayload(products[0], categories), 'customer-token'), /don't have permission/);
});

test('the admin session is refreshed when it expires and cleared when it can no longer be refreshed', async () => {
  configureCatalogBackend({ url: 'https://example.supabase.co', key: 'sb_publishable_test' });
  const store = new Map<string, string>();
  globalThis.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as Storage;
  store.set('bh-admin-session-v1', JSON.stringify({ accessToken: 'old', refreshToken: 'r1', expiresAt: Date.now() - 1, email: 'owner@example.com', userId: 'u1' }));
  mockFetch(() => json({ access_token: 'new', refresh_token: 'r2', expires_in: 3600, user: { id: 'u1', email: 'owner@example.com' } }));
  assert.equal((await currentSession())?.accessToken, 'new');
  assert.equal(JSON.parse(store.get('bh-admin-session-v1')!).refreshToken, 'r2');
  store.set('bh-admin-session-v1', JSON.stringify({ accessToken: 'old', refreshToken: 'bad', expiresAt: Date.now() - 1, email: '', userId: 'u1' }));
  mockFetch(() => json({ error_description: 'Invalid Refresh Token' }, 400));
  assert.equal(await currentSession(), null);
  assert.equal(store.has('bh-admin-session-v1'), false);
});
