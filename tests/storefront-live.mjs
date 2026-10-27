// The storefront in live mode against a simulated Supabase backend: loading the shared catalogue, a database that is
// down, owner sign-in, saving to the database (with the admin's token), failed saves, hiding a product and a fresh
// visit from another browser.
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLFormElement', 'FormData', 'Event', 'MouseEvent', 'PopStateEvent']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
window.scrollTo = () => {}; window.history.replaceState({ view: 'store' }, '', '#store');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mkdirSync('.live-dom', { recursive: true });
for (const f of readdirSync('src').filter(f => /\.tsx?$/.test(f) && !f.endsWith('.d.ts'))) {
  let out = ts.transpileModule(readFileSync('src/' + f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  out = out.replace(/from "(\.\/[^".]+)"/g, 'from "$1.js"'); writeFileSync('.live-dom/' + f.replace(/\.tsx?$/, '.js'), out);
}
const { act } = await import('react'); const { createRoot } = await import('react-dom/client'); const { jsx } = await import('react/jsx-runtime');
const store = await import('../.live-dom/catalogStore.js');
const { products } = await import('../.live-dom/catalog.js');
store.configureCatalogBackend({ url: 'https://bh.example.supabase.co', key: 'sb_publishable_test' });

// ---- simulated Supabase -------------------------------------------------------------------------------------------
const categories = ['Tees', 'Hoodies', 'Shorts', 'Accessories', 'Anime'].map((name, i) => ({ slug: name.toLowerCase(), name, description: '', image_path: null, sort_order: i, active: true }));
const rowFrom = (payload, id) => ({
  id, slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: payload.name, category_slug: payload.category_slug, description: payload.description,
  tag: payload.tag || null, sizes: payload.sizes, fabric_weights: payload.fabric_weights, price_ils: payload.price_ils, price_usd: payload.price_usd,
  lookbook_images: payload.lookbook_images, sale_enabled: payload.sale_enabled, sale_title: payload.sale_title, sale_kind: payload.sale_kind, sale_value: payload.sale_value,
  sale_currency: payload.sale_currency, sale_starts_at: payload.sale_starts_at, sale_ends_at: payload.sale_ends_at, active: payload.active, sort_order: id,
  product_colours: payload.colours.map((c, i) => ({ ...c, sort_order: i })), product_weight_prices: payload.weight_prices,
});
let db = products.map(p => rowFrom(store.productToPayload(p, categories), p.id));
const backend = { down: false, failNextSave: false, saves: [] };
const users = { 'owner@example.com': { password: 'owner-pass', token: 'admin-token', admin: true }, 'customer@example.com': { password: 'customer-pass', token: 'customer-token', admin: false } };
const json = (body, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  if (backend.down) throw new TypeError('Failed to fetch');
  const path = url.replace('https://bh.example.supabase.co', '');
  const token = init.headers?.Authorization?.replace('Bearer ', '');
  const isAdmin = token === 'admin-token';
  if (path.startsWith('/rest/v1/categories')) return json(categories);
  if (path.startsWith('/rest/v1/products')) return json(structuredClone(db.filter(row => row.active || isAdmin)));
  if (path === '/auth/v1/token?grant_type=password') {
    const { email, password } = JSON.parse(init.body); const user = users[email];
    if (!user || user.password !== password) return json({ error_description: 'Invalid login credentials' }, 400);
    return json({ access_token: user.token, refresh_token: 'refresh-' + user.token, expires_in: 3600, user: { id: email, email } });
  }
  if (path === '/auth/v1/logout') return json(undefined, 204);
  if (path === '/rest/v1/rpc/is_catalog_admin') return json(isAdmin);
  if (path === '/rest/v1/rpc/admin_save_product') {
    backend.saves.push({ token, product: JSON.parse(init.body).product });
    if (!isAdmin) return json({ code: '42501', message: 'Only an authorised BH admin can change the catalogue.' }, 403);
    if (backend.failNextSave) { backend.failNextSave = false; return json({ message: 'canceling statement due to statement timeout' }, 500); }
    const payload = JSON.parse(init.body).product;
    db = db.map(row => row.id === payload.id ? { ...rowFrom(payload, payload.id), slug: row.slug } : row);
    return json(payload.id);
  }
  return json({ message: 'unexpected request ' + path }, 404);
};

// ---- helpers -------------------------------------------------------------------------------------------------------
const settle = async (ms = 40) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
let root;
const visit = async (view = 'store') => {
  if (root) await act(() => root.unmount());
  window.history.replaceState({ view }, '', '#' + view);
  const { default: App } = await import('../.live-dom/App.js'); const { CurrencyProvider } = await import('../.live-dom/currency.js');
  root = createRoot(document.getElementById('root'));
  await act(() => root.render(jsx(CurrencyProvider, { children: jsx(App, {}) })));
  await act(async () => { window.dispatchEvent(new Event('load')); await new Promise(r => setTimeout(r, 750)); });
  await settle();
};
const click = async el => { assert.ok(el, 'Missing element'); await act(() => el.click()); await settle(); };
const btn = (text, scope = document) => [...scope.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const navigate = async view => { await act(() => { window.history.pushState({ view }, '', '#' + view); window.dispatchEvent(new PopStateEvent('popstate')); }); await settle(); };
const set = async (el, value) => act(() => { const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
const label = (text, scope = document) => [...scope.querySelectorAll('label')].find(el => el.textContent.startsWith(text))?.querySelector('input,select');
const submit = async form => { await act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); await settle(80); };
const teeCards = async () => { await navigate('store'); await click(document.querySelector('.category-float')); return [...document.querySelectorAll('.card')].map(card => card.textContent); };
const signIn = async (email, password) => { await set(label('Email'), email); await set(label('Password'), password); await submit(document.querySelector('.admin-login-card')); };

// 1. Database down: a clear "unavailable" page, no products or prices from anywhere else.
backend.down = true;
await visit('store');
assert.match(document.querySelector('.catalog-unavailable').textContent, /store is.*unavailable/s);
assert.equal(document.querySelectorAll('.card, .category-float').length, 0);
// It recovers when the database is back.
backend.down = false;
await click(btn('Try again'));
assert.match((await teeCards())[0], /Fallen Sword.*120\.00.*109\.99/s);

// 2. The storefront shows what is in the database (a change made elsewhere shows on the next visit).
db[0].product_weight_prices[0].price_ils = 125;
await visit('store');
assert.match((await teeCards())[0], /125\.00.*109\.99/s);

// 3. Owner area: wrong password, a non-admin account, then the owner.
await navigate('admin');
assert.ok(document.querySelector('.admin-login-card'), 'sign-in form first');
assert.equal(document.querySelector('.inventory-table'), null);
await signIn('owner@example.com', 'wrong');
assert.match(document.querySelector('.admin-login-error').textContent, /email or password is not correct/);
await signIn('customer@example.com', 'customer-pass');
assert.match(document.querySelector('.admin-login-card').textContent, /not a BH admin/);
await click(btn('Sign out'));
await signIn('owner@example.com', 'owner-pass');
assert.match(document.querySelector('.admin-mode.live').textContent, /owner@example\.com/);

// 4. Saving a price change goes to the database with the admin's token, and the store shows it.
await click(btn('Catalog & inventory'));
await click(document.querySelector('.inventory-table article button'));
assert.equal(label('220 GSM · ILS').value, '125');
await set(label('220 GSM · ILS'), '120');
await set(label('260 GSM · ILS sale'), '129.99');
await submit(document.querySelector('.create-item-form'));
assert.match(document.querySelector('.admin-notice').textContent, /saved to the live store/);
const saved = backend.saves.at(-1);
assert.equal(saved.token, 'admin-token');
assert.equal(saved.product.id, 1);
assert.deepEqual(saved.product.weight_prices.map(p => [p.weight, p.price_ils, p.sale_price_ils, p.price_usd, p.sale_price_usd]), [['220g', 120, 109.99, 38.99, 35.99], ['260g', 150, 129.99, 48.99, 44.99]]);
assert.deepEqual(saved.product.weight_prices[1].colours, ['White', 'Black', 'Navy', 'Dark Gray', 'Beige']);
assert.equal(saved.product.colours.length, 7);

// 5. A failed save says so and changes nothing.
const before = structuredClone(db);
backend.failNextSave = true;
await click(document.querySelector('.inventory-table article button'));
await set(label('260 GSM · USD sale'), '39.99');
await submit(document.querySelector('.create-item-form'));
assert.match(document.querySelector('.admin-save-error').textContent, /Not saved:.*statement timeout.*Nothing was changed/s);
assert.equal(document.querySelector('.admin-notice'), null);
assert.deepEqual(db, before);
await click(btn('Cancel'));

// 6. A visitor in another browser sees the saved price after the change; hiding removes the product for them.
localStorage.clear();
await visit('store');
assert.match((await teeCards())[0], /Fallen Sword.*120\.00.*109\.99/s);
await click(btn('Fallen Sword', document.querySelector('.card')));
await click([...document.querySelectorAll('.weights button')].find(b => b.textContent.includes('260 GSM')));
assert.match(document.querySelector('.price').textContent, /150\.00.*129\.99/s);
await navigate('admin');
await signIn('owner@example.com', 'owner-pass');
await click(btn('Catalog & inventory'));
await click(btn('Hide from store'));
assert.equal(db[0].active, false);
assert.match(document.querySelector('.inventory-table article').textContent, /Hidden/);
localStorage.clear();
await visit('store');
assert.ok(!(await teeCards()).some(text => text.includes('Fallen Sword')), 'hidden product is not shown to visitors');

// 7. A customer token cannot save, even when calling the database directly.
await assert.rejects(store.saveProduct(store.productToPayload(products[1], categories), 'customer-token'), /don't have permission/);

await act(() => root.unmount());
rmSync('.live-dom', { recursive: true, force: true });
console.log('PASS: live catalogue from the database, unavailable state and recovery, owner sign-in (wrong password, non-admin, admin), save with admin token, failed save, hide product, fresh visit from another browser, customer refused.');
