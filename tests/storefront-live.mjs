// The storefront in live mode against a simulated Supabase backend: loading the shared catalogue, a database that is
// down, owner sign-in, saving to the database (with the admin's token), failed saves, hiding a product and a fresh
// visit from another browser.
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLFormElement', 'FormData', 'Event', 'MouseEvent', 'PopStateEvent']) globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const scrolls = []; window.scrollTo = (options) => scrolls.push(options); window.history.replaceState({ view: 'store' }, '', '#store');
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
const categories = [['tees', 'Tees'], ['hoodies', 'Hoodies'], ['shorts', 'Pants'], ['accessories', 'Accessories'], ['anime', 'Anime']].map(([slug, name], i) => ({ slug, name, description: '', image_path: null, sort_order: i, active: true }));
const rowFrom = (payload, id) => ({
  id, slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: payload.name, category_slug: payload.category_slug, description: payload.description,
  tag: payload.tag || null, sizes: payload.sizes, fabric_weights: payload.fabric_weights, price_ils: payload.price_ils, price_usd: payload.price_usd,
  lookbook_images: payload.lookbook_images, sale_enabled: payload.sale_enabled, sale_title: payload.sale_title, sale_kind: payload.sale_kind, sale_value: payload.sale_value,
  sale_currency: payload.sale_currency, sale_starts_at: payload.sale_starts_at, sale_ends_at: payload.sale_ends_at, active: payload.active, coming_soon: payload.coming_soon, sort_order: id,
  product_colours: payload.colours.map((c, i) => ({ ...c, sort_order: i })), product_weight_prices: payload.weight_prices,
});
let db = products.map(p => rowFrom(store.productToPayload(p, categories), p.id));
const backend = { down: false, failNextSave: false, saves: [], emails: [], signupRedirects: [], expired: new Set() };
const users = {
  'owner@example.com': { password: 'owner-pass', admin: true, confirmed: true },
  'customer@example.com': { password: 'customer-pass', admin: false, confirmed: true },
};
const profiles = {};
let nextTagId = 3;
const tagsDb = [
  { id: 1, name: 'Verified', icon: 'shield-check', colour: '#2f7d5b', description: 'Verified their phone number.', rule: 'phone_verified', sort_order: 1 },
  { id: 2, name: 'Top Buyer', icon: 'gem', colour: '#8a5a3c', description: 'One of our most loyal customers.', rule: 'manual', sort_order: 2 },
];
const memberTags = {}; // email -> Set of tag ids
const tagsOf = email => (memberTags[email] ??= new Set());
const emailOfUid = uid => uid.replace(/^uid:/, '');
const uploads = [];
let automationsDb = [{ id: 1, name: 'We miss you', trigger: 'no_sign_in', days: 30, channel: 'email', subject: '{first_name}, it\'s been a while', body: 'Hi {first_name}', coupon_code: '', button_label: 'See what\'s new', marketing: true, active: false }];
let nextAutomationId = 2;
let ordersDb = []; let nextOrderId = 1;
const savedBags = {}; // email -> lines
const orderRow = (input, id) => {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const email = (input.customer_email || '').trim().toLowerCase();
  return { ...input, id, order_number: 'BH-' + String(id).padStart(5, '0'), customer_email: email, user_id: users[email] ? 'uid:' + email : null, subtotal: String(subtotal), discount: String(input.discount), shipping: String(input.shipping), total: String(subtotal - input.discount + input.shipping), source: 'manual', created_at: '2026-10-29T10:00:00Z', paid_at: null, shipped_at: null, items: input.items.map((item, index) => ({ ...item, unit_price: String(item.unit_price), sort_order: index })) };
};
const tokenFor = email => 'token:' + email;
const json = (body, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const tokenAnswer = email => json({ access_token: tokenFor(email), refresh_token: 'refresh:' + email, expires_in: 3600, user: { id: 'uid:' + email, email } });
globalThis.fetch = async (url, init = {}) => {
  if (backend.down) throw new TypeError('Failed to fetch');
  const path = url.replace('https://bh.example.supabase.co', '');
  const token = init.headers?.Authorization?.replace('Bearer ', '');
  const email = token?.startsWith('token:') ? token.slice(6) : null;
  const isAdmin = Boolean(email && users[email]?.admin);
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
  if (token && backend.expired.has(token) && !path.startsWith('/auth/v1/token')) return json({ code: 'PGRST303', message: 'JWT expired' }, 401);
  if (path.startsWith('/rest/v1/categories')) return json(categories);
  if (path.startsWith('/rest/v1/products')) return json(structuredClone(db.filter(row => row.active || isAdmin)));
  if (path === '/auth/v1/token?grant_type=password') {
    const user = users[body.email];
    if (!user || user.password !== body.password) return json({ error_description: 'Invalid login credentials' }, 400);
    if (!user.confirmed) return json({ error_description: 'Email not confirmed' }, 400);
    return tokenAnswer(body.email);
  }
  if (path === '/auth/v1/token?grant_type=id_token') {
    // Google sign-in from the site: the token's nonce must be the SHA-256 of the one-time value sent with it.
    const claims = JSON.parse(Buffer.from(body.id_token.split('.')[1], 'base64url').toString());
    const hashed = (await import('node:crypto')).createHash('sha256').update(body.nonce).digest('hex');
    if (body.provider !== 'google' || claims.nonce !== hashed) return json({ msg: 'Nonces mismatch' }, 400);
    users[claims.email] ??= { password: null, admin: false, confirmed: true };
    return tokenAnswer(claims.email);
  }
  if (path === '/auth/v1/token?grant_type=refresh_token') { backend.expired.delete(tokenFor(body.refresh_token.slice(8))); return tokenAnswer(body.refresh_token.slice(8)); }
  if (path.startsWith('/auth/v1/signup')) {
    backend.signupRedirects.push(new URL(url).searchParams.get('redirect_to'));
    if (users[body.email]) return json({ msg: 'User already registered' }, 422);
    users[body.email] = { password: body.password, admin: false, confirmed: false, code: '482915', data: body.data };
    backend.emails.push(body.email);
    return json({ id: 'uid:' + body.email, email: body.email, confirmation_sent_at: new Date().toISOString() });
  }
  if (path === '/auth/v1/verify' && body.type !== 'phone_change') {
    const user = users[body.email];
    if (!user || body.type !== 'signup' || body.token !== user.code) return json({ msg: 'Token has expired or is invalid' }, 403);
    user.confirmed = true; return tokenAnswer(body.email);
  }
  if (path === '/auth/v1/settings') return json({ external: { email: true, google: true, facebook: true, apple: false } });
  if (path === '/auth/v1/user' && init.method === 'PUT') {
    if (!email) return json({ msg: 'invalid JWT' }, 401);
    if (backend.smsOff) return json({ msg: 'Unsupported phone provider' }, 422);
    users[email].pendingPhone = body.phone; users[email].smsCode = '654321'; return json({ id: 'uid:' + email, email });
  }
  if (path === '/auth/v1/verify' && body.type === 'phone_change') {
    const user = users[email];
    if (!user || body.phone !== user.pendingPhone || body.token !== user.smsCode) return json({ msg: 'Token has expired or is invalid' }, 403);
    user.phone = body.phone.slice(1); user.phoneConfirmed = true; return tokenAnswer(email);
  }
  if (path === '/auth/v1/user' && email) return json({ id: 'uid:' + email, email, phone: users[email]?.phone ?? '', phone_confirmed_at: users[email]?.phoneConfirmed ? '2026-10-28T10:00:00Z' : null, user_metadata: users[email]?.meta ?? {} });
  if (path === '/auth/v1/user') return email ? json({ id: 'uid:' + email, email, user_metadata: users[email]?.meta ?? {} }) : json({ msg: 'invalid JWT' }, 401);
  if (path === '/auth/v1/resend') { backend.emails.push(body.email); return json({}); }
  if (path === '/auth/v1/logout') return json(undefined, 204);
  if (path.startsWith('/rest/v1/profiles')) {
    if (!email) return json({ message: 'permission denied for table profiles' }, 401);
    if (init.method === 'POST') {
      if (body.id !== 'uid:' + email) return json({ message: 'new row violates row-level security policy' }, 403);
      const { id, ...profile } = body; profiles[email] = { ...profiles[email], ...profile }; return json([profiles[email]], 201);
    }
    return json(profiles[email] ? [profiles[email]] : []);
  }
  if (path === '/rest/v1/rpc/is_catalog_admin') return json(isAdmin);
  if (path.startsWith('/storage/v1/object/avatars/')) {
    const file = path.slice('/storage/v1/object/avatars/'.length);
    if (!email || !file.startsWith('uid:' + email + '/')) return json({ message: 'new row violates row-level security policy' }, 403);
    uploads.push(file); return json({ Key: 'avatars/' + file });
  }
  if (path.startsWith('/rest/v1/tags')) {
    const id = Number(new URL(url).searchParams.get('id')?.replace('eq.', ''));
    if (!init.method || init.method === 'GET') return json([...tagsDb].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
    if (!isAdmin) return json({ message: 'new row violates row-level security policy for table "tags"' }, 403);
    if (init.method === 'POST') { const tag = { ...body, id: nextTagId++ }; tagsDb.push(tag); return json([tag], 201); }
    const index = tagsDb.findIndex(tag => tag.id === id);
    if (init.method === 'PATCH') { tagsDb[index] = { ...tagsDb[index], ...body }; return json([tagsDb[index]]); }
    if (init.method === 'DELETE') { tagsDb.splice(index, 1); Object.values(memberTags).forEach(set => set.delete(id)); return json([{ id }]); }
  }
  if (path.startsWith('/rest/v1/user_tags')) {
    const params = new URL(url).searchParams;
    if (!init.method || init.method === 'GET') {
      const owner = emailOfUid(params.get('user_id').replace('eq.', ''));
      if (owner !== email && !isAdmin) return json([]);
      return json([...tagsOf(owner)].map(id => ({ tags: tagsDb.find(tag => tag.id === id) ?? null })));
    }
    if (!isAdmin) return json({ message: 'new row violates row-level security policy for table "user_tags"' }, 403);
    if (init.method === 'POST') { tagsOf(emailOfUid(body.user_id)).add(body.tag_id); return json(undefined, 201); }
    if (init.method === 'DELETE') { tagsOf(emailOfUid(params.get('user_id').replace('eq.', ''))).delete(Number(params.get('tag_id').replace('eq.', ''))); return json(undefined, 204); }
  }
  if (path === '/rest/v1/rpc/claim_phone_tags') {
    if (!email || !users[email]?.phoneConfirmed) return json(0);
    const before = tagsOf(email).size; tagsDb.filter(tag => tag.rule === 'phone_verified').forEach(tag => tagsOf(email).add(tag.id));
    return json(tagsOf(email).size - before);
  }
  if (path.startsWith('/rest/v1/cart_items')) {
    if (!email) return json({ message: 'permission denied for table cart_items' }, 401);
    return json(structuredClone(savedBags[email] ?? []));
  }
  if (path === '/rest/v1/rpc/save_my_cart') {
    if (!email) return json({ message: 'permission denied' }, 401);
    assert.ok(body.lines.every(line => !('unit_price' in line) && !('price' in line)), 'prices are never sent with the bag');
    savedBags[email] = structuredClone(body.lines); return json(body.lines.length);
  }
  if (path === '/rest/v1/rpc/admin_save_order') {
    if (!isAdmin) return json({ code: '42501', message: 'Only an authorised BH admin can change orders.' }, 403);
    const input = body.input; if (!input.items?.length) return json({ message: 'An order needs at least one item.' }, 400);
    backend.lastOrderInput = structuredClone(input);
    const id = input.id ?? nextOrderId++; ordersDb = [...ordersDb.filter(row => row.id !== id), { ...orderRow(input, id), payment_status: 'unpaid', receipt_number: '', receipt_url: '', payment_provider: '', payment_reference: '' }]; return json(id);
  }
  if (path.startsWith('/rest/v1/orders')) {
    if (!email) return json({ message: 'permission denied for table orders' }, 401);
    const mine = new URL(url).searchParams.get('user_id');
    const visible = ordersDb.filter(row => isAdmin || row.user_id === 'uid:' + email).filter(row => !mine || row.user_id === mine.replace('eq.', ''));
    return json(structuredClone([...visible].reverse()));
  }
  if (path.startsWith('/rest/v1/automations')) {
    if (!isAdmin) return (!init.method || init.method === 'GET') ? json([]) : json({ message: 'new row violates row-level security policy for table "automations"' }, 403);
    const id = Number(new URL(url).searchParams.get('id')?.replace('eq.', ''));
    if (!init.method || init.method === 'GET') return json(structuredClone(automationsDb));
    if (init.method === 'POST') { const row = { ...body, id: nextAutomationId++ }; automationsDb.push(row); return json([row], 201); }
    if (init.method === 'PATCH') { automationsDb = automationsDb.map(row => row.id === id ? { ...row, ...body } : row); return json(automationsDb.filter(row => row.id === id)); }
    if (init.method === 'DELETE') { automationsDb = automationsDb.filter(row => row.id !== id); return json([{ id }]); }
  }
  if (path === '/rest/v1/rpc/admin_automation_reach') return isAdmin ? json(body.rule === 'no_sign_in' && body.only_opted_in === true ? 3 : null) : json({ code: '42501', message: 'not authorised' }, 403);
  if (path === '/rest/v1/rpc/admin_find_members') {
    if (!isAdmin) return json({ code: '42501', message: 'not authorised' }, 403);
    return json(Object.keys(users).filter(who => who.includes(body.search)).map(who => ({ id: 'uid:' + who, email: who, first_name: profiles[who]?.first_name ?? '', last_name: profiles[who]?.last_name ?? '', username: '', avatar_url: profiles[who]?.avatar_url ?? '', tag_ids: [...tagsOf(who)] })));
  }
  if (path === '/rest/v1/rpc/admin_save_product') {
    backend.saves.push({ token, product: body.product });
    if (!isAdmin) return json({ code: '42501', message: 'Only an authorised BH admin can change the catalogue.' }, 403);
    if (backend.failNextSave) { backend.failNextSave = false; return json({ message: 'canceling statement due to statement timeout' }, 500); }
    db = db.map(row => row.id === body.product.id ? { ...rowFrom(body.product, body.product.id), slug: row.slug } : row);
    return json(body.product.id);
  }
  return json({ message: 'unexpected request ' + path }, 404);
};

// ---- helpers -------------------------------------------------------------------------------------------------------
const settle = async (ms = 40) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
let root;
const visit = async (view = 'store', rawHash) => {
  if (root) await act(() => root.unmount());
  if (rawHash) window.history.replaceState(null, '', rawHash); else window.history.replaceState({ view }, '', '#' + view);
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
const modal = () => document.querySelector('.auth-modal');
const openSignIn = async () => { if (!modal()) await click(btn('Sign in')); assert.ok(modal(), 'sign-in window open'); };
const signIn = async (email, password, remember = true) => {
  await openSignIn();
  await set(label('Email address', modal()), email); await set(label('Password', modal()), password);
  const box = modal().querySelector('.remember-me input'); if (box.checked !== remember) await click(box);
  await submit(modal().querySelector('form'));
};
const accountMenuText = () => document.querySelector('.account-dropdown')?.textContent ?? '';
const clearBrowser = () => { localStorage.clear(); sessionStorage.clear(); };

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

// 3. Owner area: needs a real sign-in; wrong password, a customer account, then the owner.
await navigate('admin');
assert.match(document.querySelector('.admin-login').textContent, /Owner.*sign in/s);
assert.equal(document.querySelector('.inventory-table'), null);
await signIn('owner@example.com', 'wrong');
assert.match(modal().querySelector('.auth-message.error').textContent, /email or password is not correct/);
await signIn('customer@example.com', 'customer-pass');
assert.equal(modal(), null);
assert.match(document.querySelector('.admin-login').textContent, /not a BH admin/);
assert.doesNotMatch(accountMenuText(), /Owner area/, 'customers have no Owner area link');
await click(btn('Sign out'));
await navigate('admin');
await signIn('owner@example.com', 'owner-pass');
assert.match(document.querySelector('.admin-mode.live').textContent, /owner@example\.com/);
assert.match(accountMenuText(), /Owner area/);

// 4. Saving a price change goes to the database with the admin's token, and the store shows it.
await click(btn('Catalog & inventory'));
assert.ok(document.querySelector('.inventory-table article .inventory-actions') && btn('Hide from store'), 'Manage and Hide buttons are grouped');
await click(document.querySelector('.inventory-table article button'));
assert.equal(label('220 GSM · ILS').value, '125');
await set(label('220 GSM · ILS'), '120');
await set(label('260 GSM · ILS sale'), '129.99');
await submit(document.querySelector('.create-item-form'));
assert.match(document.querySelector('.admin-notice').textContent, /saved to the live store/);
const saved = backend.saves.at(-1);
assert.equal(saved.token, 'token:owner@example.com');
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
clearBrowser();
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
// The owner stays signed in after a refresh (Remember me was on).
await visit('account');
assert.match(accountMenuText(), /owner@example\.com.*Owner area/s);
assert.ok(btn('Owner area', document.querySelector('.account-clean-hero')));
assert.ok(localStorage.getItem('bh-session-v1'));
// The page stayed open past the 1-hour sign-in: the Owner area renews the token instead of showing "code is wrong".
backend.expired.add(tokenFor('owner@example.com'));
await navigate('admin');
assert.ok(btn('Catalog & inventory'), 'Owner area loads after renewing the sign-in');
assert.equal(document.querySelector('.admin-login-error'), null);
assert.equal(backend.expired.size, 0);
clearBrowser();
await visit('store');
assert.ok(!(await teeCards()).some(text => text.includes('Fallen Sword')), 'hidden product is not shown to visitors');

// 7. A customer token cannot save, even when calling the database directly.
await assert.rejects(store.saveProduct(store.productToPayload(products[1], categories), 'token:customer@example.com'), /don't have permission/);

// 8. Without "Remember me" the session only lives for this browser session (it still survives a refresh).
await visit('account');
await signIn('customer@example.com', 'customer-pass', false);
assert.equal(localStorage.getItem('bh-session-v1'), null);
assert.ok(sessionStorage.getItem('bh-session-v1'));
await visit('account');
assert.match(accountMenuText(), /customer@example\.com/);
assert.equal(btn('Owner area', document.querySelector('.account-clean-hero') ?? document.body), undefined, 'no Owner area for customers');
assert.doesNotMatch(accountMenuText(), /Owner area/);

// 9. Saving profile details goes to the database and shows a clear confirmation at the top.
scrolls.length = 0;
await set(label('First name'), 'Noa'); await set(label('Last name'), 'Levi');
assert.equal(label('Country'), undefined, 'no country field: currency follows the visitor\'s time zone');
await set(label('Date of birth'), '1995-04-02');
await submit(document.querySelector('.profile-form'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /Your changes have been saved/);
assert.ok(scrolls.some(options => options?.top === 0), 'page scrolls to the top');
assert.deepEqual(profiles['customer@example.com'], { first_name: 'Noa', last_name: 'Levi', username: '', birthday: '1995-04-02', country: '', avatar_url: '', marketing_opt_in: false });
await visit('account');
assert.equal(label('First name').value, 'Noa', 'details are still there after a refresh');
assert.match(document.querySelector('.account-clean-hero').textContent, /Welcome back.*Noa/s);
// The birthday editor closes after saving and the page shows the saved date.
await click(btn('Edit birthday'));
await set(document.querySelector('.birthday-card input[type="date"]'), '1995-05-03');
await submit(document.querySelector('.birthday-card form'));
assert.equal(document.querySelector('.birthday-card form'), null);
assert.match(document.querySelector('.save-banner.save-ok').textContent, /saved/);
assert.equal(profiles['customer@example.com'].birthday, '1995-05-03');
await click(btn('Sign out', document.querySelector('.account-dropdown')));
assert.equal(sessionStorage.getItem('bh-session-v1'), null);

// 10. New accounts confirm their email with a code before they are signed in.
await click(document.querySelector('.account-menu .icon'));
await click(btn('New to BH?'));
await set(label('Username', modal()), 'shira'); await set(label('Email address', modal()), 'new@example.com');
assert.equal(label('Date of birth', modal()), undefined, 'no birthday at sign-up (a reminder asks later)');
await set(label('Password', modal()), 'a-good-password'); await set(label('Confirm password', modal()), 'a-good-password');
await submit(modal().querySelector('form'));
assert.match(modal().querySelector('.auth-message.error').textContent, /letters and numbers/, 'passwords need a number');
await set(label('Password', modal()), 'a-good-password7'); await set(label('Confirm password', modal()), 'a-good-password7');
assert.equal(label(' Send me BH updates', modal()).checked, false, 'updates are optional and never pre-ticked');
await click(label(' Send me BH updates', modal()));
await submit(modal().querySelector('form'));
assert.deepEqual(backend.emails, ['new@example.com']);
assert.equal(users['new@example.com'].data.wants_updates, 'yes', 'the choice also travels with the confirmation link');
assert.match(modal().textContent, /VERIFY EMAIL.*new@example\.com/s);
assert.equal(localStorage.getItem('bh-session-v1'), null, 'not signed in before the code');
await set(label('Confirmation code', modal()), '000000');
await submit(modal().querySelector('form'));
assert.match(modal().querySelector('.auth-message.error').textContent, /wrong or has expired/);
await set(label('Confirmation code', modal()), '482915');
await submit(modal().querySelector('form'));
assert.equal(modal(), null);
assert.match(accountMenuText(), /new@example\.com/);
assert.deepEqual(profiles['new@example.com'], { first_name: '', last_name: '', username: 'shira', birthday: null, country: '', avatar_url: '', marketing_opt_in: true });
assert.match(document.querySelector('.link-notice.save-ok').textContent, /Your email is confirmed and you're signed in/, 'green message after the code too');
await click(btn('Sign out', document.querySelector('.account-dropdown')));
assert.equal(backend.signupRedirects[0], 'http://localhost/', 'the confirmation link brings people back to the site');
// An unconfirmed account cannot log in until the code is entered.
users['late@example.com'] = { password: 'late-pass', admin: false, confirmed: false, code: '111222' };
await click(document.querySelector('.account-menu .icon'));
await signIn('late@example.com', 'late-pass');
assert.match(modal().textContent, /VERIFY EMAIL/);


// 11. Without a custom email template Supabase sends a confirmation link; it brings the customer back signed in.
users['link@example.com'] = { password: 'link-pass', admin: false, confirmed: true };
clearBrowser();
await visit(undefined, '#access_token=token:link@example.com&refresh_token=refresh:link@example.com&expires_in=3600&token_type=bearer&type=signup');
assert.match(document.querySelector('.link-notice.save-ok').textContent, /email is confirmed/);
assert.match(accountMenuText(), /link@example\.com/);
assert.equal(window.location.hash, '#account', 'the tokens are removed from the address');
assert.ok(localStorage.getItem('bh-session-v1'));
clearBrowser();
await visit(undefined, '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
assert.match(document.querySelector('.link-notice.save-fail').textContent, /expired or was already used/);
assert.equal(accountMenuText(), '');

// 12. Google / Facebook buttons appear for the providers switched on in Supabase, and bring people back signed in.
await click(document.querySelector('.account-menu .icon'));
const socialLinks = [...modal().querySelectorAll('.social-button')];
assert.deepEqual(socialLinks.map(a => a.textContent), ['Continue with Google', 'Continue with Facebook']);
assert.equal(socialLinks[0].getAttribute('href'), 'https://bh.example.supabase.co/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%2F');
await click(modal().querySelector('.auth-close'));
users['dana@gmail.com'] = { password: null, admin: false, confirmed: true, meta: { full_name: 'Dana Cohen' } };
clearBrowser();
await visit(undefined, '#access_token=token:dana@gmail.com&refresh_token=refresh:dana@gmail.com&expires_in=3600&provider_token=x&token_type=bearer');
assert.match(document.querySelector('.link-notice.save-ok').textContent, /You're signed in/);
assert.match(accountMenuText(), /Dana Cohen/);
assert.deepEqual(profiles['dana@gmail.com'], { first_name: 'Dana', last_name: 'Cohen', username: '', birthday: null, country: '', avatar_url: '', marketing_opt_in: false });

// 13. Impossible dates are explained in plain words and never sent to the database.
const before13 = structuredClone(profiles['dana@gmail.com']);
await set(label('Date of birth'), '0001-01-01');
await submit(document.querySelector('.profile-form'));
assert.match(document.querySelector('.save-banner.save-fail').textContent, /date of birth isn't valid/);
assert.doesNotMatch(document.querySelector('.save-banner').textContent, /constraint|relation/);
assert.deepEqual(profiles['dana@gmail.com'], before13);

// 14. Profile picture: uploaded into the member's own folder and shown on the account and in the header.
const picture = new File([new Uint8Array([255, 216, 255, 224])], 'me.jpg', { type: 'image/jpeg' });
const pictureInput = document.querySelector('.account-clean-hero .avatar-editor input[type=file]');
Object.defineProperty(pictureInput, 'files', { value: [picture], configurable: true });
await act(() => pictureInput.dispatchEvent(new Event('change', { bubbles: true }))); await settle(120);
assert.match(document.querySelector('.save-banner.save-ok').textContent, /profile picture has been saved/);
assert.equal(uploads.length, 1); assert.match(uploads[0], /^uid:dana@gmail\.com\/\d+\.jpg$/);
assert.equal(profiles['dana@gmail.com'].avatar_url, 'https://bh.example.supabase.co/storage/v1/object/public/avatars/' + uploads[0]);
assert.equal(document.querySelector('.account-clean-hero .avatar-orb img').getAttribute('src'), profiles['dana@gmail.com'].avatar_url);
assert.ok(document.querySelector('header .account-menu .avatar-header img'), 'picture in the header');
assert.equal(document.querySelector('.avatar-picker'), null, 'no separate picture card: the picture itself is the editor');
await click(document.querySelector('.account-clean-hero .avatar-tool.remove'));
assert.equal(profiles['dana@gmail.com'].avatar_url, '');
assert.equal(document.querySelector('.account-clean-hero .avatar-orb img'), null);
assert.equal(document.querySelector('.account-clean-hero .avatar-tool.remove'), null, 'nothing to remove when showing initials');
assert.equal(document.querySelector('.account-clean-hero .avatar-orb').textContent, 'DC');

// 15. Phone verification gives the Verified tag (and a wrong code or a missing SMS service is explained plainly).
await click(btn('Account settings', document.querySelector('.account-dashboard aside')));
assert.equal(document.querySelector('.settings-list > article:first-child'), document.querySelector('.verify-item'), 'verification is the first setting');
assert.equal(document.querySelector('.account-panel .admin-demo-note'), null);
const updatesSwitch = () => document.querySelector('.settings-list [aria-label="BH updates by email"]');
assert.equal(updatesSwitch().getAttribute('aria-checked'), 'false');
await click(updatesSwitch()); await settle(80);
assert.equal(profiles['dana@gmail.com'].marketing_opt_in, true); assert.equal(updatesSwitch().getAttribute('aria-checked'), 'true');
await click(updatesSwitch()); await settle(80);
assert.equal(profiles['dana@gmail.com'].marketing_opt_in, false, 'members can switch updates off any time');
backend.smsOff = true;
await set(document.querySelector('.verify-item input[type=tel]'), '050-123-4567');
await submit(document.querySelector('.verify-item form'));
assert.match(document.querySelector('.save-banner.save-fail').textContent, /Phone verification isn't switched on yet/);
backend.smsOff = false;
await submit(document.querySelector('.verify-item form'));
assert.equal(users['dana@gmail.com'].pendingPhone, '+972501234567', 'Israeli number sent in international format');
await set(document.querySelector('.verify-item input[aria-label="SMS code"]'), '111111');
await submit(document.querySelector('.verify-item form'));
assert.match(document.querySelector('.save-banner.save-fail').textContent, /code is wrong or has expired/);
await set(document.querySelector('.verify-item input[aria-label="SMS code"]'), '654321');
await submit(document.querySelector('.verify-item form'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /phone is verified/);
assert.match(document.querySelector('.verify-item').textContent, /Verified.*\+972501234567 is confirmed/s);
assert.match(document.querySelector('.account-clean-hero .member-tags').textContent, /Verified/);
await visit('account');
assert.deepEqual([...document.querySelectorAll('.account-clean-hero .member-tag')].map(tag => tag.textContent), ['Verified'], 'tag stays after a refresh');

// 16. A customer cannot create or give tags, even calling the database directly.
await assert.rejects(store.saveTag({ name: 'Me', icon: 'star', colour: '#000000', description: '', rule: 'manual', sort_order: 1 }, 'token:dana@gmail.com'), /permission/);
await assert.rejects(store.setMemberTag('uid:dana@gmail.com', 2, true, 'token:dana@gmail.com'), /permission/);

// 17. Owner area → Member tags: create a tag and give it to a member; it shows on their profile.
clearBrowser();
await visit('admin');
await signIn('owner@example.com', 'owner-pass');
await click(btn('Member tags'));
assert.deepEqual([...document.querySelectorAll('.tag-table .member-tag')].map(tag => tag.textContent), ['Verified', 'Top Buyer']);
assert.equal(document.querySelector('.admin-demo-note'), null, 'tags are real, not a demo');
await click(btn('Create tag'));
await set(label('Tag name'), 'Early Supporter'); await set(label('Icon'), 'heart');
await submit(document.querySelector('.tag-form'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /"Early Supporter" tag has been saved/);
assert.equal(tagsDb.at(-1).name, 'Early Supporter');
await set(document.querySelector('.tag-search input'), 'dana');
await submit(document.querySelector('.tag-search'));
const danaRow = [...document.querySelectorAll('.member-list article')].find(row => row.textContent.includes('dana@gmail.com'));
await click([...danaRow.querySelectorAll('.member-tag-toggles button')].find(b => b.textContent === 'Early Supporter'));
assert.ok(tagsOf('dana@gmail.com').has(tagsDb.at(-1).id));
await click([...document.querySelectorAll('.tag-table article')].find(row => row.textContent.includes('Top Buyer')).querySelector('button'));
await set(label('Tag name'), 'Top Customer');
await submit(document.querySelector('.tag-form'));
assert.ok(tagsDb.some(tag => tag.name === 'Top Customer') && !tagsDb.some(tag => tag.name === 'Top Buyer'), 'tag edited');
window.confirm = () => true;
await click([...document.querySelectorAll('.tag-table article')].find(row => row.textContent.includes('Top Customer')).querySelectorAll('button')[1]);
assert.ok(!tagsDb.some(tag => tag.name === 'Top Customer'), 'tag deleted');

// 18. Owner area → Automations: see who matches, switch on, create with a live preview, delete.
await click(btn('Automations'));
assert.match(document.querySelector('.automation-note').textContent, /Nothing is sent yet/);
assert.match(document.querySelector('.automation-list').textContent, /We miss you.*hasn't signed in for 30 days.*Updates only.*3 members match today \(with updates on\)/s);
// Edit opens right where the automation is, not at the top of the page.
await click(btn('Edit', document.querySelector('.automation-list')));
assert.ok(document.querySelector('.automation-list .automation-editor'), 'editor opens in place');
assert.equal(document.querySelectorAll('.automation-editor').length, 1);
assert.equal(label('Automation name').value, 'We miss you');
await click(btn('Cancel', document.querySelector('.automation-editor')));
await click(document.querySelector('.automation-list .switch'));
assert.equal(automationsDb[0].active, true);
await click(btn('Create automation'));
await set(label('Automation name'), 'Birthday gift'); await set(label('When'), 'birthday');
await set(label('Coupon code'), 'bday15'); await set(label('Email subject'), 'Happy birthday, {first_name}!');
await act(() => { const area = document.querySelector('.automation-form textarea'); Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, 'Use {coupon} this week.'); area.dispatchEvent(new Event('input', { bubbles: true })); });
assert.equal(label('Days'), undefined, 'birthday has no days field');
const email = document.querySelector('.email-preview iframe').getAttribute('srcdoc');
assert.match(email, /<h1[^>]*>Happy birthday, Dana!<\/h1>/, 'centred title');
assert.match(email, /Use BDAY15 this week/); assert.match(email, />BDAY15<\/div>/, 'code box');
assert.match(email, />BH<\/div>.*Clothing/s, 'logo'); assert.match(email, /The BH team/, 'signature'); assert.match(email, /Unsubscribe/, 'marketing emails can be unsubscribed');
await set(label('Button text'), 'Claim my gift');
assert.match(document.querySelector('.email-preview iframe').getAttribute('srcdoc'), />Claim my gift<\/a>/);
await submit(document.querySelector('.automation-editor'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /"Birthday gift" has been saved/);
assert.deepEqual({ ...automationsDb.at(-1), id: 0 }, { id: 0, name: 'Birthday gift', trigger: 'birthday', days: 0, channel: 'email', subject: 'Happy birthday, {first_name}!', body: 'Use {coupon} this week.', coupon_code: 'BDAY15', button_label: 'Claim my gift', marketing: true, active: false });
await click([...document.querySelectorAll('.automation-list article')].find(row => row.textContent.includes('Birthday gift')).querySelector('.danger'));
assert.equal(automationsDb.length, 1);
await assert.rejects(store.saveAutomation({ name: 'x', trigger: 'welcome', days: 0, channel: 'email', subject: 's', body: 'b', coupon_code: '', button_label: 'Go', marketing: false, active: true }, 'token:dana@gmail.com'), /permission/);

// 19. Orders before payments: the owner records a test order; it stays unpaid with no receipt; the member sees it.
await click(btn('Orders', document.querySelector('.admin-shell aside')));
assert.equal(document.querySelector('.admin-demo-note'), null, 'orders are real, not samples');
assert.match(document.querySelector('.automation-note').textContent, /Payments and receipts are not connected yet/);
assert.match(document.querySelector('.orders-admin').textContent, /No orders yet/);
await click(btn('Record an order'));
await set(label('Full name'), 'Dana Cohen'); await set(label('Email'), 'Dana@Gmail.com'); await set(label('City'), 'Tel Aviv');
await set(label('Piece'), String(products.find(p => p.name === 'Oni Blade').id));
await set(label('Colour'), 'Black'); await set(label('Fabric'), '260g'); await set(label('Size'), 'L'); await set(label('Qty'), '2');
await click(btn('Add piece'));
const pieceRow = document.querySelector('.order-form .order-items li');
assert.match(pieceRow.textContent, /Oni Blade.*260 GSM.*×2/s);
assert.equal(label('Price each', pieceRow).value, '139.99', 'store price (sale price) for 260 GSM in ILS');
await set(label('Shipping'), '25'); await set(label('Discount'), '10');
assert.match(document.querySelector('.order-money .grand').textContent, /294\.98/);
assert.equal(label('Payment'), undefined, 'no way to mark an order paid'); assert.equal(label('Receipt number'), undefined, 'no way to attach a receipt');
assert.equal(label(' Test order', document.querySelector('.order-form')).checked, true, 'new orders are test orders by default');
assert.match(document.querySelector('.order-form').textContent, /Payment: Not paid/);
await submit(document.querySelector('.order-form'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /order has been recorded/);
assert.equal(ordersDb.length, 1); assert.equal(ordersDb[0].user_id, 'uid:dana@gmail.com', 'linked to Dana\'s account by email');
assert.ok(!('payment_status' in backend.lastOrderInput) && !('receipt_number' in backend.lastOrderInput), 'the website never sends payment or receipt fields');
assert.deepEqual(backend.lastOrderInput.items[0], { product_id: products.find(p => p.name === 'Oni Blade').id, product_name: 'Oni Blade', colour: 'Black', size: 'L', fabric_weight: '260g', quantity: 2, unit_price: 139.99, image: backend.lastOrderInput.items[0].image }, 'piece, variant and price at the time of the order');
assert.match(document.querySelector('.order-detail').textContent, /BH-00001.*Not paid.*Test order.*Dana Cohen.*Total₪294\.98.*Not paid\. Payments aren't connected yet.*No receipt/s);
await click(btn('Edit order'));
await set(label('Order status'), 'shipped'); await set(label('Tracking number'), 'RR123456789IL');
await submit(document.querySelector('.order-form'));
assert.equal(ordersDb.length, 1, 'edited, not duplicated'); assert.equal(ordersDb[0].payment_status, 'unpaid');
await click(btn('All orders'));
assert.match(document.querySelector('.order-table').textContent, /BH-00001.*Dana Cohen.*Shipped.*Not paid.*Test.*294\.98/s);
await set(document.querySelector('.order-filters input'), 'nobody');
assert.match(document.querySelector('.orders-admin').textContent, /No orders match/);
await assert.rejects(store.saveOrder({ customer_name: 'x', customer_email: '', items: [{ product_name: 'x', quantity: 1, unit_price: 1 }] }, 'token:customer@example.com'), /permission/);
// Dana sees the order in her account: marked as a test, not paid, no receipt.
clearBrowser();
users['dana@gmail.com'].password = 'dana-pass';
await visit('account');
await signIn('dana@gmail.com', 'dana-pass');
await click(btn('Orders & shipments', document.querySelector('.account-dashboard aside')));
const myOrder = document.querySelector('.my-orders article');
assert.match(myOrder.textContent, /ORDER BH-00001.*Shipped.*Test order.*Oni Blade.*Black · L · 260 GSM · ×2/s);
assert.match(myOrder.textContent, /Tracking: RR123456789IL.*Not paid · no receipt/s);
assert.equal(myOrder.querySelector('a[href*="receipt"]'), null);
assert.equal(document.querySelector('.account-panel .admin-demo-note'), null, 'real orders, not an example');
// The account icon always opens the account's first page (My profile), even after visiting Orders.
await navigate('home');
await click(document.querySelector('header .account-menu > button'));
assert.match(document.querySelector('.account-panel').textContent, /MY PROFILE/i);

// 20. The bag is saved: in this browser for visitors, in the account for members (and it follows them to any device).
const bagCount = () => document.querySelector('header .bag span').textContent;
const addOniBlade = async (size) => {
  await navigate('store'); await click(document.querySelector('.category-float'));
  await click(btn('Oni Blade', [...document.querySelectorAll('.card')].find(card => card.textContent.includes('Oni Blade'))));
  await click(btn(size, document.querySelector('.sizes'))); await click(document.querySelector('.add-bag'));
};
await click(btn('Sign out', document.querySelector('.account-dropdown')));
clearBrowser();
await visit('store');
assert.equal(bagCount(), '00');
await addOniBlade('M');
assert.equal(bagCount(), '01');
await visit('store');
assert.equal(bagCount(), '01', 'a visitor\'s bag survives a refresh');
// Signing in moves the visitor's bag into the account.
savedBags['dana@gmail.com'] = [{ product_id: products.find(p => p.name === 'Rose').id, colour: 'White', size: 'L', fabric_weight: '220g', quantity: 2 }];
await visit('account');
await signIn('dana@gmail.com', 'dana-pass');
await settle(400);
assert.equal(bagCount(), '03', 'saved bag (2) plus the piece added before signing in (1)');
assert.equal(savedBags['dana@gmail.com'].length, 2); assert.equal(localStorage.getItem('bh-bag-v1'), null, 'no longer kept in the browser');
await addOniBlade('M'); await settle(400);
assert.deepEqual(savedBags['dana@gmail.com'].map(line => [line.size, line.quantity]), [['L', 2], ['M', 2]], 'same piece again adds to its quantity');
// Another device: the same bag is there after signing in.
clearBrowser();
await visit('account');
assert.equal(bagCount(), '00');
await signIn('dana@gmail.com', 'dana-pass'); await settle(400);
assert.equal(bagCount(), '04', 'the bag follows the member');
await click(document.querySelector('header .bag'));
await click(document.querySelector('.drawer-items button'));
await settle(400);
assert.equal(bagCount(), '03');
assert.equal(savedBags['dana@gmail.com'].reduce((sum, line) => sum + line.quantity, 0), 3, 'removing a piece is saved too');
await click(btn('Sign out', document.querySelector('.account-dropdown')));
assert.equal(bagCount(), '00', 'signed out: the member\'s bag is not shown');

// 21. Google sign-in opened from BH's own site (Google's button); the regular link stays as a fallback.
let gis = null;
window.google = { accounts: { id: { initialize: options => { gis = options; }, renderButton: element => { element.innerHTML = '<div role="button">Continue with Google</div>'; } } } };
clearBrowser();
await visit('home');
await click(document.querySelector('.account-menu > button')); await settle(150);
assert.ok(gis, 'Google button set up'); assert.equal(gis.client_id, store.GOOGLE_CLIENT_ID);
assert.equal(document.querySelector('.google-gis.waiting'), null); assert.equal(document.querySelector('.social-button.google'), null, 'the fallback link is replaced');
const googleToken = claims => ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');
await act(async () => { gis.callback({ credential: googleToken({ email: 'gina@gmail.com', given_name: 'Gina', family_name: 'Levi', nonce: gis.nonce }) }); await new Promise(r => setTimeout(r, 300)); }); await settle(200);
assert.match(accountMenuText(), /gina@gmail\.com/);
assert.equal(profiles['gina@gmail.com'].first_name, 'Gina'); assert.equal(profiles['gina@gmail.com'].last_name, 'Levi');
// Signing in with Google again doesn't overwrite a name the member changed.
profiles['gina@gmail.com'].first_name = 'G';
await click(btn('Sign out', document.querySelector('.account-dropdown')));
await click(document.querySelector('.account-menu > button')); await settle(150);
await act(async () => { gis.callback({ credential: googleToken({ email: 'gina@gmail.com', given_name: 'Gina', nonce: gis.nonce }) }); await new Promise(r => setTimeout(r, 300)); }); await settle(200);
assert.equal(profiles['gina@gmail.com'].first_name, 'G');
// A token made for another sign-in attempt (wrong nonce) is refused with a plain message.
await click(btn('Sign out', document.querySelector('.account-dropdown')));
await click(document.querySelector('.account-menu > button')); await settle(150);
await act(async () => { gis.callback({ credential: googleToken({ email: 'gina@gmail.com', nonce: 'other' }) }); await new Promise(r => setTimeout(r, 300)); }); await settle(100);
assert.ok(document.querySelector('.auth-message.error'), 'refused');
assert.doesNotMatch(accountMenuText(), /gina@gmail\.com/);
delete window.google;

await act(() => root.unmount());
rmSync('.live-dom', { recursive: true, force: true });
console.log('PASS: Google sign-in from BH\'s own site, bag saved in the account and in the browser, unpaid test orders recorded by the owner and shown to members (no payment or receipt from the website), BH updates choice, designed automation emails, automations, profile pictures, phone verification with the Verified tag, owner-managed member tags, real accounts (stay signed in after refresh, remember me, email code and confirmation-link sign-up, Google/Facebook sign-in, plain-language date errors, owner-only Owner area, profile save with confirmation), live catalogue from the database, unavailable state and recovery, owner sign-in (wrong password, non-admin, admin), save with admin token, failed save, hide product, fresh visit from another browser, customer refused.');
