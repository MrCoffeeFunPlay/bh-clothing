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
let automationsDb = [{ id: 1, name: 'We miss you', trigger: 'no_sign_in', days: 30, channel: 'email', subject: '{first_name}, it\'s been a while', body: 'Hi {first_name}', coupon_code: '', active: false }];
let nextAutomationId = 2;
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
  if (path.startsWith('/rest/v1/automations')) {
    if (!isAdmin) return (!init.method || init.method === 'GET') ? json([]) : json({ message: 'new row violates row-level security policy for table "automations"' }, 403);
    const id = Number(new URL(url).searchParams.get('id')?.replace('eq.', ''));
    if (!init.method || init.method === 'GET') return json(structuredClone(automationsDb));
    if (init.method === 'POST') { const row = { ...body, id: nextAutomationId++ }; automationsDb.push(row); return json([row], 201); }
    if (init.method === 'PATCH') { automationsDb = automationsDb.map(row => row.id === id ? { ...row, ...body } : row); return json(automationsDb.filter(row => row.id === id)); }
    if (init.method === 'DELETE') { automationsDb = automationsDb.filter(row => row.id !== id); return json([{ id }]); }
  }
  if (path === '/rest/v1/rpc/admin_automation_reach') return isAdmin ? json(body.rule === 'no_sign_in' ? 3 : null) : json({ code: '42501', message: 'not authorised' }, 403);
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
await set(label('First name'), 'Noa'); await set(label('Last name'), 'Levi'); await set(label('Country'), 'Israel');
await set(label('Date of birth'), '1995-04-02');
await submit(document.querySelector('.profile-form'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /Your changes have been saved/);
assert.ok(scrolls.some(options => options?.top === 0), 'page scrolls to the top');
assert.deepEqual(profiles['customer@example.com'], { first_name: 'Noa', last_name: 'Levi', username: '', birthday: '1995-04-02', country: 'Israel', avatar_url: '' });
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
assert.deepEqual(profiles['new@example.com'], { first_name: '', last_name: '', username: 'shira', birthday: '2000-01-15', country: '', avatar_url: '' });
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
assert.deepEqual(profiles['dana@gmail.com'], { first_name: 'Dana', last_name: 'Cohen', username: '', birthday: null, country: '', avatar_url: '' });

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
assert.match(document.querySelector('.automation-list').textContent, /We miss you.*hasn't signed in for 30 days.*3 members match today/s);
await click(document.querySelector('.automation-list .switch'));
assert.equal(automationsDb[0].active, true);
await click(btn('Create automation'));
await set(label('Automation name'), 'Birthday gift'); await set(label('When'), 'birthday');
await set(label('Coupon code'), 'bday15'); await set(label('Email subject'), 'Happy birthday, {first_name}!');
await act(() => { const area = document.querySelector('.automation-form textarea'); Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, 'Use {coupon} this week.'); area.dispatchEvent(new Event('input', { bubbles: true })); });
assert.equal(label('Days'), undefined, 'birthday has no days field');
assert.match(document.querySelector('.email-preview').textContent, /Happy birthday, Dana!.*Use bday15 this week/s);
await submit(document.querySelector('.automation-editor'));
assert.match(document.querySelector('.save-banner.save-ok').textContent, /"Birthday gift" has been saved/);
assert.deepEqual({ ...automationsDb.at(-1), id: 0 }, { id: 0, name: 'Birthday gift', trigger: 'birthday', days: 0, channel: 'email', subject: 'Happy birthday, {first_name}!', body: 'Use {coupon} this week.', coupon_code: 'BDAY15', active: false });
await click([...document.querySelectorAll('.automation-list article')].find(row => row.textContent.includes('Birthday gift')).querySelector('.danger'));
assert.equal(automationsDb.length, 1);
await assert.rejects(store.saveAutomation({ name: 'x', trigger: 'welcome', days: 0, channel: 'email', subject: 's', body: 'b', coupon_code: '', active: true }, 'token:dana@gmail.com'), /permission/);

await act(() => root.unmount());
rmSync('.live-dom', { recursive: true, force: true });
console.log('PASS: automations, profile pictures, phone verification with the Verified tag, owner-managed member tags, real accounts (stay signed in after refresh, remember me, email code and confirmation-link sign-up, Google/Facebook sign-in, plain-language date errors, owner-only Owner area, profile save with confirmation), live catalogue from the database, unavailable state and recovery, owner sign-in (wrong password, non-admin, admin), save with admin token, failed save, hide product, fresh visit from another browser, customer refused.');
