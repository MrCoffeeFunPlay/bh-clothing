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
const categories = ['Tees', 'Hoodies', 'Shorts', 'Accessories', 'Anime'].map((name, i) => ({ slug: name.toLowerCase(), name, description: '', image_path: null, sort_order: i, active: true }));
const rowFrom = (payload, id) => ({
  id, slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: payload.name, category_slug: payload.category_slug, description: payload.description,
  tag: payload.tag || null, sizes: payload.sizes, fabric_weights: payload.fabric_weights, price_ils: payload.price_ils, price_usd: payload.price_usd,
  lookbook_images: payload.lookbook_images, sale_enabled: payload.sale_enabled, sale_title: payload.sale_title, sale_kind: payload.sale_kind, sale_value: payload.sale_value,
  sale_currency: payload.sale_currency, sale_starts_at: payload.sale_starts_at, sale_ends_at: payload.sale_ends_at, active: payload.active, sort_order: id,
  product_colours: payload.colours.map((c, i) => ({ ...c, sort_order: i })), product_weight_prices: payload.weight_prices,
});
let db = products.map(p => rowFrom(store.productToPayload(p, categories), p.id));
const backend = { down: false, failNextSave: false, saves: [], emails: [], signupRedirects: [] };
const users = {
  'owner@example.com': { password: 'owner-pass', admin: true, confirmed: true },
  'customer@example.com': { password: 'customer-pass', admin: false, confirmed: true },
};
const profiles = {};
const tokenFor = email => 'token:' + email;
const json = (body, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const tokenAnswer = email => json({ access_token: tokenFor(email), refresh_token: 'refresh:' + email, expires_in: 3600, user: { id: 'uid:' + email, email } });
globalThis.fetch = async (url, init = {}) => {
  if (backend.down) throw new TypeError('Failed to fetch');
  const path = url.replace('https://bh.example.supabase.co', '');
  const token = init.headers?.Authorization?.replace('Bearer ', '');
  const email = token?.startsWith('token:') ? token.slice(6) : null;
  const isAdmin = Boolean(email && users[email]?.admin);
  const body = init.body ? JSON.parse(init.body) : {};
  if (path.startsWith('/rest/v1/categories')) return json(categories);
  if (path.startsWith('/rest/v1/products')) return json(structuredClone(db.filter(row => row.active || isAdmin)));
  if (path === '/auth/v1/token?grant_type=password') {
    const user = users[body.email];
    if (!user || user.password !== body.password) return json({ error_description: 'Invalid login credentials' }, 400);
    if (!user.confirmed) return json({ error_description: 'Email not confirmed' }, 400);
    return tokenAnswer(body.email);
  }
  if (path === '/auth/v1/token?grant_type=refresh_token') return tokenAnswer(body.refresh_token.slice(8));
  if (path.startsWith('/auth/v1/signup')) {
    backend.signupRedirects.push(new URL(url).searchParams.get('redirect_to'));
    if (users[body.email]) return json({ msg: 'User already registered' }, 422);
    users[body.email] = { password: body.password, admin: false, confirmed: false, code: '482915', data: body.data };
    backend.emails.push(body.email);
    return json({ id: 'uid:' + body.email, email: body.email, confirmation_sent_at: new Date().toISOString() });
  }
  if (path === '/auth/v1/verify') {
    const user = users[body.email];
    if (!user || body.type !== 'signup' || body.token !== user.code) return json({ msg: 'Token has expired or is invalid' }, 403);
    user.confirmed = true; return tokenAnswer(body.email);
  }
  if (path === '/auth/v1/user') return email ? json({ id: 'uid:' + email, email }) : json({ msg: 'invalid JWT' }, 401);
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
await set(label('First name'), 'Noa'); await set(label('Last name'), 'Levi'); await set(label('Country'), 'Israel');
await set(label('Date of birth'), '1995-04-02');
await submit(document.querySelector('.profile-form'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /Your changes have been saved/);
assert.ok(scrolls.some(options => options?.top === 0), 'page scrolls to the top');
assert.deepEqual(profiles['customer@example.com'], { first_name: 'Noa', last_name: 'Levi', username: '', birthday: '1995-04-02', country: 'Israel' });
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
await set(label('Date of birth', modal()), '2000-01-15');
await set(label('Password', modal()), 'a-good-password'); await set(label('Confirm password', modal()), 'a-good-password');
await submit(modal().querySelector('form'));
assert.deepEqual(backend.emails, ['new@example.com']);
assert.match(modal().textContent, /VERIFY EMAIL.*new@example\.com/s);
assert.equal(localStorage.getItem('bh-session-v1'), null, 'not signed in before the code');
await set(label('Confirmation code', modal()), '000000');
await submit(modal().querySelector('form'));
assert.match(modal().querySelector('.auth-message.error').textContent, /wrong or has expired/);
await set(label('Confirmation code', modal()), '482915');
await submit(modal().querySelector('form'));
assert.equal(modal(), null);
assert.match(accountMenuText(), /new@example\.com/);
assert.deepEqual(profiles['new@example.com'], { first_name: '', last_name: '', username: 'shira', birthday: '2000-01-15', country: '' });
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

await act(() => root.unmount());
rmSync('.live-dom', { recursive: true, force: true });
console.log('PASS: real accounts (stay signed in after refresh, remember me, email code and confirmation-link sign-up, owner-only Owner area, profile save with confirmation), live catalogue from the database, unavailable state and recovery, owner sign-in (wrong password, non-admin, admin), save with admin token, failed save, hide product, fresh visit from another browser, customer refused.');
