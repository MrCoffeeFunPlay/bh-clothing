import type { Product } from "./catalog";
import type { Currency, Sale } from "./pricing";

// Live catalogue in Supabase: reading the shared catalogue, admin sign-in, saving products and uploading images.
// Only public browser settings live here. The publishable key is designed to ship in browser code; what it can
// read or change is decided by the database's row level security (supabase/migrations). Never add a secret or
// service-role key to this file or to any VITE_ variable.
const PROJECT = { url: "https://yazgrvobxwpyayyekwnh.supabase.co", key: "sb_publishable_QEtO4aTHDV_YCfRDCvENKQ_HdcKxvQk" };

type Config = { url: string; key: string };
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
// Vite builds (dev and production) use the live catalogue; plain Node test runs start in preview mode.
let config: Config | null = env?.MODE
  ? { url: (env.VITE_SUPABASE_URL || PROJECT.url).replace(/\/$/, ""), key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || PROJECT.key }
  : null;
export const configureCatalogBackend = (next: Config | null) => { config = next; };
export const liveCatalogConfigured = () => config !== null;

export class CatalogError extends Error {
  status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

type Weight = "220g" | "260g";
type Money = number | string | null;
export type CategoryRow = { slug: string; name: string; description: string; image_path: string | null; sort_order: number; active: boolean };
export type ColourRow = { name: string; hex: string; front_image: string; back_image: string | null; sort_order: number };
export type WeightPriceRow = { weight: Weight; price_ils: Money; price_usd: Money; sale_price_ils: Money; sale_price_usd: Money; colours: string[] };
export type ProductRow = {
  id: number; slug: string; name: string; category_slug: string; description: string; tag: string | null; sizes: string[];
  fabric_weights: Weight[]; price_ils: Money; price_usd: Money; lookbook_images: string[];
  sale_enabled: boolean; sale_title: string; sale_kind: "percent" | "amount"; sale_value: Money; sale_currency: Currency;
  sale_starts_at: string | null; sale_ends_at: string | null; active: boolean; coming_soon?: boolean; sort_order: number;
  product_colours: ColourRow[]; product_weight_prices: WeightPriceRow[];
};

const amount = (value: Money) => value === null || value === "" ? null : Number(value);

export function productFromRow(row: ProductRow, categories: CategoryRow[]): Product {
  const colours = [...row.product_colours].sort((a, b) => a.sort_order - b.sort_order);
  const names = colours.map(colour => colour.name);
  const byWeight = Object.fromEntries(row.product_weight_prices.map(price => [price.weight, price])) as Partial<Record<Weight, WeightPriceRow>>;
  const weights = row.fabric_weights.filter(weight => byWeight[weight]);
  const pick = <T,>(make: (price: WeightPriceRow) => T) => Object.fromEntries(weights.map(weight => [weight, make(byWeight[weight]!)])) as Record<Weight, T>;
  const sale: Sale = {
    enabled: row.sale_enabled, title: row.sale_title, kind: row.sale_kind, value: amount(row.sale_value) ?? 0, currency: row.sale_currency,
    startsAt: row.sale_starts_at ?? "", endsAt: row.sale_ends_at ?? "",
  };
  return {
    id: row.id, slug: row.slug, active: row.active, comingSoon: row.coming_soon === true, name: row.name,
    category: categories.find(category => category.slug === row.category_slug)?.name ?? row.category_slug,
    price: "Coming soon", rating: 0, reviews: 0, tag: row.tag ?? undefined, description: row.description, sizes: row.sizes,
    color: names.join(", "), image: colours[0]?.front_image ?? "", images: colours.map(colour => colour.front_image),
    colorImages: Object.fromEntries(colours.map(colour => [colour.name, colour.front_image])),
    backImages: Object.fromEntries(colours.filter(colour => colour.back_image).map(colour => [colour.name, colour.back_image!])),
    colorHexes: Object.fromEntries(colours.map(colour => [colour.name, colour.hex])),
    cottonWeights: weights, lookbookImages: row.lookbook_images, sale,
    ...(weights.length
      ? {
        gsmPrices: pick(price => ({ ILS: amount(price.price_ils), USD: amount(price.price_usd) })),
        gsmSalePrices: pick(price => ({ ILS: amount(price.sale_price_ils), USD: amount(price.sale_price_usd) })),
        weightColors: pick(price => price.colours.filter(colour => names.includes(colour))),
      }
      : { prices: { ILS: amount(row.price_ils), USD: amount(row.price_usd) } }),
  };
}

// The JSON that public.admin_save_product(product jsonb) expects.
export function productToPayload(product: Product, categories: CategoryRow[]) {
  const colourNames = Object.keys(product.colorImages ?? {});
  const weights = product.cottonWeights ?? [];
  const sale = product.sale;
  return {
    id: product.id > 0 && product.slug ? product.id : null,
    name: product.name,
    category_slug: categories.find(category => category.name === product.category)?.slug ?? product.category.toLowerCase(),
    description: product.description ?? "", tag: product.tag ?? "", sizes: product.sizes ?? [], fabric_weights: weights,
    price_ils: weights.length ? null : product.prices?.ILS ?? null, price_usd: weights.length ? null : product.prices?.USD ?? null,
    lookbook_images: product.lookbookImages ?? [],
    sale_enabled: Boolean(sale?.enabled), sale_title: sale?.title ?? "", sale_kind: sale?.kind ?? "percent", sale_value: sale?.value ?? 0,
    sale_currency: sale?.currency ?? "ILS", sale_starts_at: sale?.startsAt || null, sale_ends_at: sale?.endsAt || null,
    active: product.active ?? true,
    coming_soon: product.comingSoon === true,
    colours: colourNames.map(name => ({ name, hex: product.colorHexes?.[name] ?? "#8d8275", front_image: product.colorImages![name], back_image: product.backImages?.[name] ?? null })),
    weight_prices: weights.map(weight => ({
      weight,
      price_ils: product.gsmPrices?.[weight]?.ILS ?? null, price_usd: product.gsmPrices?.[weight]?.USD ?? null,
      sale_price_ils: product.gsmSalePrices?.[weight]?.ILS ?? null, sale_price_usd: product.gsmSalePrices?.[weight]?.USD ?? null,
      colours: product.weightColors?.[weight] ?? colourNames,
    })),
  };
}

const readableError = (body: { message?: string; msg?: string; error_description?: string; error?: string } | null, status: number) => {
  const text = body?.message || body?.msg || body?.error_description || body?.error || "";
  if (/invalid login credentials/i.test(text)) return "The email or password is not correct.";
  if (/phone provider|sms|phone.*(disabled|not enabled)/i.test(text)) return "Phone verification isn't switched on yet. Please try again later.";
  if (/phone.*already|already.*phone/i.test(text)) return "This phone number is already used by another account.";
  if (/invalid.*phone|phone.*invalid/i.test(text)) return "Check the phone number and include the country code, e.g. +972 50 123 4567.";
  if (/email not confirmed/i.test(text)) return "Confirm your email first: enter the code we sent you.";
  if (/already registered|already exists/i.test(text)) return "An account with this email already exists. Log in instead.";
  if (/jwt|bad_jwt/i.test(text)) return "Your sign-in has expired. Please sign in again.";
  if (/expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(text)) return "That code is wrong or has expired. Check the message we sent you or send a new code.";
  if (/rate limit|too many|security purposes/i.test(text)) return "Too many attempts. Please wait a minute and try again.";
  if (/password/i.test(text) && /(at least|weak|short)/i.test(text)) return "Choose a stronger password (at least 8 characters).";
  if (status === 401 || status === 403 || /permission denied|row-level security|authorised/i.test(text)) return "You don't have permission to do this. Sign in again.";
  return friendlyDataError(text) || text || `Something went wrong (${status}). Please try again.`;
};

// Database rules (check constraints etc.) explained in plain words; never show raw database messages to people.
const constraintMessages: [RegExp, string][] = [
  [/profiles_birthday_check/, "The date of birth isn't valid. Please choose a real date."],
  [/profiles_(first_name|last_name|username|country)_check/, "One of your details is too long. Please shorten it."],
  [/sale_price_(ils|usd)_check/, "A sale price must be lower than the original price in the same currency."],
  [/price_(ils|usd)_check/, "Prices must be more than 0."],
  [/products_slug_key|duplicate key/, "Something with this name already exists. Choose a different name."],
  [/products_check|sale_value_check/, "Check the sale: the discount must be more than 0 (up to 100%) and the end must be after the start."],
  [/hex_check/, "Choose a valid colour swatch."],
  [/orders_total_check/, "The discount can't be more than the items plus shipping."],
  [/order_items_quantity_check/, "Each item needs a quantity between 1 and 99."],
  [/orders_customer_name_check/, "Add the customer's name."],
  [/automations_days_check/, "Days must be between 0 and 365."],
  [/automations_(name|subject|body)_check/, "Fill in the name, subject and message (and keep them within the length limit)."],
  [/tags_(name|description)_check/, "Give the tag a name of up to 30 characters (description up to 160)."],
];
const technical = /violates|constraint|relation "|column "|syntax|invalid input|null value|out of range|does not exist|operator|malformed/i;
function friendlyDataError(text: string) {
  for (const [pattern, message] of constraintMessages) if (pattern.test(text)) return message;
  if (/invalid input syntax for type (date|timestamp)|date\/time field value out of range/i.test(text)) return "One of the dates isn't valid. Please check it.";
  if (technical.test(text)) return "Some details aren't valid. Please check them and try again.";
  return "";
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  if (!config) throw new CatalogError("The live store database is not configured.");
  let response: Response;
  try {
    response = await fetch(config.url + path, {
      ...init,
      headers: { apikey: config.key, ...(init.body instanceof Blob ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    });
  } catch {
    throw new CatalogError("The store database could not be reached. Check the connection and try again.");
  }
  const text = await response.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  if (!response.ok) throw new CatalogError(readableError(body, response.status), response.status);
  return body as T;
}

export async function fetchCatalog(token?: string) {
  const [categories, rows] = await Promise.all([
    request<CategoryRow[]>("/rest/v1/categories?select=*&order=sort_order", {}, token),
    request<ProductRow[]>("/rest/v1/products?select=*,product_colours(*),product_weight_prices(*)&order=sort_order", {}, token),
  ]);
  if (!Array.isArray(categories) || !Array.isArray(rows)) throw new CatalogError("The store database returned an unexpected answer.");
  return { categories, products: rows.map(row => productFromRow(row, categories)) };
}

export const saveProduct = (payload: ReturnType<typeof productToPayload>, token: string) =>
  request<number>("/rest/v1/rpc/admin_save_product", { method: "POST", body: JSON.stringify({ product: payload }) }, token);

export async function uploadProductImage(file: File, token: string) {
  if (!config) throw new CatalogError("The live store database is not configured.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new CatalogError("Use a JPG, PNG or WebP image.");
  if (file.size > 10 * 1024 * 1024) throw new CatalogError("Images can be up to 10 MB.");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await request(`/storage/v1/object/product-images/${path}`, { method: "POST", body: file, headers: { "Content-Type": file.type, "x-upsert": "false" } }, token);
  return `${config.url}/storage/v1/object/public/product-images/${path}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Accounts (Supabase Auth). "Remember me" keeps the session in this browser; otherwise it lasts until the browser
// is closed. Either way a page refresh keeps the user signed in. New accounts confirm their email with a code.
// ---------------------------------------------------------------------------------------------------------------
export type UserSession = { accessToken: string; refreshToken: string; expiresAt: number; email: string; userId: string; remember: boolean };
export type AdminSession = UserSession;
type TokenAnswer = { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email?: string } };
const SESSION_KEY = "bh-session-v1";

const stores = () => {
  const list: Storage[] = [];
  try { if (typeof localStorage !== "undefined") list.push(localStorage); } catch { /* blocked storage */ }
  try { if (typeof sessionStorage !== "undefined") list.push(sessionStorage); } catch { /* blocked storage */ }
  return list;
};
const toSession = (answer: TokenAnswer, remember: boolean): UserSession => ({
  accessToken: answer.access_token, refreshToken: answer.refresh_token, expiresAt: Date.now() + answer.expires_in * 1000,
  email: answer.user.email ?? "", userId: answer.user.id, remember,
});
const keep = (session: UserSession | null) => {
  for (const store of stores()) { try { store.removeItem(SESSION_KEY); } catch { /* ignore */ } }
  if (session) {
    try { (session.remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Signed in for this page view only. */ }
  }
  return session;
};

export async function signIn(email: string, password: string, remember = true) {
  const answer = await request<TokenAnswer>("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  return keep(toSession(answer, remember))!;
}

// Creates the account. With email confirmation on (the BH setting), no session is returned until the email is
// confirmed, either with the code (custom email template) or the link in Supabase's default email, which brings the
// visitor back to this page (see sessionFromConfirmationLink).
export async function signUp(email: string, password: string, details: Record<string, string>, remember = true) {
  const back = typeof window !== "undefined" ? `?redirect_to=${encodeURIComponent(window.location.origin + window.location.pathname)}` : "";
  const answer = await request<Partial<TokenAnswer>>(`/auth/v1/signup${back}`, { method: "POST", body: JSON.stringify({ email, password, data: details }) });
  return answer.access_token && answer.refresh_token && answer.user ? keep(toSession(answer as TokenAnswer, remember)) : null;
}

export async function verifySignupCode(email: string, code: string, remember = true) {
  const answer = await request<TokenAnswer>("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "signup", email, token: code.trim() }) });
  return keep(toSession(answer, remember))!;
}

// Sign-in with Google, Facebook or Apple (Supabase Auth). Only providers switched on in the Supabase dashboard are
// offered; the provider sends the customer back here with the session in the address.
export type SocialProvider = "google" | "facebook" | "apple";
export const socialProviders: SocialProvider[] = ["google", "facebook", "apple"];
const REMEMBER_KEY = "bh-social-remember";

export async function enabledSocialProviders(): Promise<SocialProvider[]> {
  const settings = await request<{ external?: Record<string, boolean> }>("/auth/v1/settings");
  return socialProviders.filter((provider) => settings?.external?.[provider]);
}

export function socialSignInUrl(provider: SocialProvider) {
  if (!config) throw new CatalogError("The live store database is not configured.");
  const back = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  return `${config.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(back)}`;
}
export const rememberSocialChoice = (remember: boolean) => { try { sessionStorage.setItem(REMEMBER_KEY, remember ? "1" : "0"); } catch { /* defaults to remember */ } };

// The confirmation link from the sign-up email, and Google/Facebook/Apple sign-in, return here with the session in the
// address: #access_token=…&refresh_token=…&expires_in=…&type=signup (or #error=…&error_description=…).
export type RedirectResult = { session: UserSession; kind: "signup" | "social"; fullName: string; wantsUpdates: boolean } | { error: string };
export async function sessionFromConfirmationLink(hash: string): Promise<RedirectResult | null> {
  const values = new URLSearchParams(hash.replace(/^#/, ""));
  if (values.get("error") || values.get("error_description")) {
    const text = values.get("error_description") || values.get("error") || "";
    return { error: /expired|invalid/i.test(text) ? "This confirmation link has expired or was already used. Log in, or sign up again for a new link."
      : /access_denied|cancel/i.test(text) ? "Sign-in was cancelled." : "Sign-in didn't finish. Please try again." };
  }
  const accessToken = values.get("access_token"); const refreshToken = values.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  const user = await request<{ id: string; email?: string; user_metadata?: { full_name?: string; name?: string; wants_updates?: string } }>("/auth/v1/user", {}, accessToken);
  let remember = true;
  try { remember = sessionStorage.getItem(REMEMBER_KEY) !== "0"; sessionStorage.removeItem(REMEMBER_KEY); } catch { /* keep default */ }
  const kind = values.get("type") === "signup" ? "signup" : "social";
  const session = keep(toSession({ access_token: accessToken, refresh_token: refreshToken, expires_in: Number(values.get("expires_in")) || 3600, user }, kind === "signup" || remember))!;
  return { session, kind, fullName: user.user_metadata?.full_name || user.user_metadata?.name || "", wantsUpdates: user.user_metadata?.wants_updates === "yes" };
}

export const resendSignupCode = (email: string) =>
  request("/auth/v1/resend", { method: "POST", body: JSON.stringify({ type: "signup", email }) });

// force: refresh even when the stored token still looks valid (the server said it had expired).
export async function currentSession(force = false): Promise<UserSession | null> {
  let stored: UserSession | null = null;
  for (const store of stores()) {
    try { stored = JSON.parse(store.getItem(SESSION_KEY) || "null"); } catch { stored = null; }
    if (stored) break;
  }
  if (!stored?.refreshToken) return null;
  if (!force && stored.expiresAt - Date.now() > 60_000) return stored;
  try {
    const answer = await request<TokenAnswer>("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: stored.refreshToken }) });
    return keep(toSession(answer, stored.remember !== false));
  } catch (error) {
    // Only forget the session when the server rejected it; keep it if the network was briefly unavailable.
    if (error instanceof CatalogError && error.status > 0) return keep(null);
    return stored;
  }
}

export async function signOut(session: UserSession | null) {
  keep(null);
  if (session) await request("/auth/v1/logout", { method: "POST" }, session.accessToken).catch(() => undefined);
}

export const isCatalogAdmin = (session: UserSession) =>
  request<boolean>("/rest/v1/rpc/is_catalog_admin", { method: "POST", body: "{}" }, session.accessToken);

// ---------------------------------------------------------------------------------------------------------------
// Customer profile (public.profiles): each user reads and saves only their own row.
// ---------------------------------------------------------------------------------------------------------------
export type Profile = { first_name: string; last_name: string; username: string; birthday: string | null; country: string; avatar_url: string; marketing_opt_in: boolean };
export const emptyProfile = (): Profile => ({ first_name: "", last_name: "", username: "", birthday: null, country: "", avatar_url: "", marketing_opt_in: false });
const PROFILE_COLUMNS = "first_name,last_name,username,birthday,country,avatar_url,marketing_opt_in";

export async function fetchProfile(session: UserSession): Promise<Profile | null> {
  const rows = await request<Profile[]>(`/rest/v1/profiles?id=eq.${encodeURIComponent(session.userId)}&select=${PROFILE_COLUMNS}`, {}, session.accessToken);
  return rows?.[0] ?? null;
}

export async function saveProfile(session: UserSession, profile: Profile): Promise<Profile> {
  const rows = await request<Profile[]>(`/rest/v1/profiles?on_conflict=id&select=${PROFILE_COLUMNS}`, {
    method: "POST", body: JSON.stringify({ id: session.userId, ...profile, birthday: profile.birthday || null }),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  }, session.accessToken);
  if (!rows?.[0]) throw new CatalogError("Your details were not saved. Please try again.");
  return rows[0];
}

// Profile picture: stored in the public "avatars" bucket, inside the member's own folder (<user id>/…).
export async function uploadAvatar(session: UserSession, image: Blob) {
  if (!config) throw new CatalogError("The live store database is not configured.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) throw new CatalogError("Use a JPG, PNG or WebP image.");
  if (image.size > 2 * 1024 * 1024) throw new CatalogError("The picture is too large. Choose one up to 2 MB.");
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `${session.userId}/${Date.now()}.${extension}`;
  await request(`/storage/v1/object/avatars/${path}`, { method: "POST", body: image, headers: { "Content-Type": image.type, "x-upsert": "false" } }, session.accessToken);
  return `${config.url}/storage/v1/object/public/avatars/${path}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Tags: badges shown under a member's name. The owner creates them and gives them out; "phone_verified" tags are
// collected automatically once the member confirms their phone number.
// ---------------------------------------------------------------------------------------------------------------
export const tagIcons = ["badge-check", "shield-check", "crown", "sparkles", "gem", "star", "heart", "flame", "zap", "trophy"] as const;
export type TagIcon = (typeof tagIcons)[number];
export type Tag = { id: number; name: string; icon: TagIcon; colour: string; description: string; rule: "manual" | "phone_verified"; sort_order: number };
export type TagDraft = Omit<Tag, "id"> & { id?: number };
export type Member = { id: string; email: string; first_name: string; last_name: string; username: string; avatar_url: string; tag_ids: number[] };
const TAG_COLUMNS = "id,name,icon,colour,description,rule,sort_order";
const byOrder = (a: Tag, b: Tag) => a.sort_order - b.sort_order || a.id - b.id;

export async function fetchTags(token?: string) {
  return (await request<Tag[]>(`/rest/v1/tags?select=${TAG_COLUMNS}&order=sort_order,id`, {}, token)) ?? [];
}

export async function fetchMyTags(session: UserSession) {
  const rows = await request<{ tags: Tag | null }[]>(`/rest/v1/user_tags?user_id=eq.${encodeURIComponent(session.userId)}&select=tags(${TAG_COLUMNS})`, {}, session.accessToken);
  return (rows ?? []).map(row => row.tags).filter((tag): tag is Tag => Boolean(tag)).sort(byOrder);
}

export async function saveTag(tag: TagDraft, token: string) {
  const { id, ...fields } = tag;
  const body = JSON.stringify({ ...fields, name: fields.name.trim(), description: fields.description.trim() });
  const rows = id
    ? await request<Tag[]>(`/rest/v1/tags?id=eq.${id}&select=${TAG_COLUMNS}`, { method: "PATCH", body, headers: { Prefer: "return=representation" } }, token)
    : await request<Tag[]>(`/rest/v1/tags?select=${TAG_COLUMNS}`, { method: "POST", body, headers: { Prefer: "return=representation" } }, token);
  if (!rows?.[0]) throw new CatalogError("The tag was not saved. You may not have permission.");
  return rows[0];
}

export async function deleteTag(id: number, token: string) {
  const rows = await request<Tag[]>(`/rest/v1/tags?id=eq.${id}&select=id`, { method: "DELETE", headers: { Prefer: "return=representation" } }, token);
  if (!rows?.length) throw new CatalogError("The tag was not deleted. You may not have permission.");
}

export const findMembers = (search: string, token: string) =>
  request<Member[]>("/rest/v1/rpc/admin_find_members", { method: "POST", body: JSON.stringify({ search }) }, token).then(rows => rows ?? []);

export async function setMemberTag(userId: string, tagId: number, give: boolean, token: string) {
  if (give) await request("/rest/v1/user_tags", { method: "POST", body: JSON.stringify({ user_id: userId, tag_id: tagId }), headers: { Prefer: "return=minimal" } }, token);
  else await request(`/rest/v1/user_tags?user_id=eq.${encodeURIComponent(userId)}&tag_id=eq.${tagId}`, { method: "DELETE" }, token);
}

// Phone verification (Supabase Auth sends the SMS code; needs an SMS provider switched on in the Supabase dashboard).
export const claimPhoneTags = (session: UserSession) =>
  request<number>("/rest/v1/rpc/claim_phone_tags", { method: "POST", body: "{}" }, session.accessToken);

export async function phoneStatus(session: UserSession) {
  const user = await request<{ phone?: string; phone_confirmed_at?: string | null; new_phone?: string }>("/auth/v1/user", {}, session.accessToken);
  return { phone: user?.phone ?? "", verified: Boolean(user?.phone && user?.phone_confirmed_at) };
}

// International format: + and country code, e.g. 050-123-4567 in Israel becomes +972501234567.
export function normalisePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^0\d{8,9}$/.test(digits)) return "+972" + digits.slice(1);
  return "";
}

export const sendPhoneCode = (session: UserSession, phone: string) =>
  request("/auth/v1/user", { method: "PUT", body: JSON.stringify({ phone }) }, session.accessToken);

export async function confirmPhoneCode(session: UserSession, phone: string, code: string) {
  const answer = await request<TokenAnswer>("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "phone_change", phone, token: code.trim() }) }, session.accessToken);
  const next = answer?.access_token ? keep(toSession(answer, session.remember))! : session;
  await claimPhoneTags(next);
  return next;
}

// ---------------------------------------------------------------------------------------------------------------
// Automations (Owner area): a rule plus the message a matching member gets. Admins only.
// ---------------------------------------------------------------------------------------------------------------
export const automationTriggers = ["welcome", "no_sign_in", "no_order", "birthday", "cart_left"] as const;
export type AutomationTrigger = (typeof automationTriggers)[number];
export type Automation = { id: number; name: string; trigger: AutomationTrigger; days: number; channel: "email"; subject: string; body: string; coupon_code: string; button_label: string; marketing: boolean; active: boolean };
export type AutomationDraft = Omit<Automation, "id"> & { id?: number };
const AUTOMATION_COLUMNS = "id,name,trigger,days,channel,subject,body,coupon_code,button_label,marketing,active";

export const fetchAutomations = (token: string) =>
  request<Automation[]>(`/rest/v1/automations?select=${AUTOMATION_COLUMNS}&order=id`, {}, token).then(rows => rows ?? []);

export async function saveAutomation(automation: AutomationDraft, token: string) {
  const { id, ...fields } = automation;
  const body = JSON.stringify({ ...fields, name: fields.name.trim(), subject: fields.subject.trim(), coupon_code: fields.coupon_code.trim().toUpperCase(), button_label: fields.button_label.trim() });
  const rows = id
    ? await request<Automation[]>(`/rest/v1/automations?id=eq.${id}&select=${AUTOMATION_COLUMNS}`, { method: "PATCH", body, headers: { Prefer: "return=representation" } }, token)
    : await request<Automation[]>(`/rest/v1/automations?select=${AUTOMATION_COLUMNS}`, { method: "POST", body, headers: { Prefer: "return=representation" } }, token);
  if (!rows?.[0]) throw new CatalogError("The automation was not saved. You may not have permission.");
  return rows[0];
}

export async function deleteAutomation(id: number, token: string) {
  const rows = await request<{ id: number }[]>(`/rest/v1/automations?id=eq.${id}&select=id`, { method: "DELETE", headers: { Prefer: "return=representation" } }, token);
  if (!rows?.length) throw new CatalogError("The automation was not deleted. You may not have permission.");
}

// Marketing automations only count members who chose to get BH updates.
export const automationReach = (trigger: AutomationTrigger, days: number, marketing: boolean, token: string) =>
  request<number | null>("/rest/v1/rpc/admin_automation_reach", { method: "POST", body: JSON.stringify({ rule: trigger, after_days: days, only_opted_in: marketing }) }, token);

// ---------------------------------------------------------------------------------------------------------------
// Orders. Members read their own; the owner records and updates them (admin_save_order works out the totals).
// ---------------------------------------------------------------------------------------------------------------
export const orderStatuses = ["new", "processing", "shipped", "delivered", "cancelled", "returned"] as const;
export const paymentStatuses = ["unpaid", "paid", "refunded"] as const;
export const paymentMethods = ["bit", "paybox", "bank_transfer", "cash", "card", "other"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type OrderItem = { product_id: number | null; product_name: string; colour: string; size: string; fabric_weight: string; quantity: number; unit_price: number; image: string };
export type Order = {
  id: number; order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  address_line: string; city: string; postal_code: string; country: string; currency: "ILS" | "USD";
  subtotal: number; discount: number; shipping: number; total: number;
  payment_method: PaymentMethod; payment_status: PaymentStatus; status: OrderStatus;
  tracking_number: string; tracking_url: string; receipt_number: string; receipt_url: string; notes: string;
  source: "manual" | "website"; created_at: string; paid_at: string | null; shipped_at: string | null; items: OrderItem[];
};
export type OrderDraft = Omit<Order, "id" | "order_number" | "subtotal" | "total" | "source" | "created_at" | "paid_at" | "shipped_at"> & { id?: number };
const ORDER_SELECT = "*,items:order_items(product_id,product_name,colour,size,fabric_weight,quantity,unit_price,image,sort_order)";
type OrderRow = Omit<Order, "items" | "subtotal" | "discount" | "shipping" | "total" | "unit_price"> & { subtotal: number | string; discount: number | string; shipping: number | string; total: number | string; items: (OrderItem & { unit_price: number | string; sort_order: number })[] };
const orderFromRow = (row: OrderRow): Order => ({
  ...row, subtotal: Number(row.subtotal), discount: Number(row.discount), shipping: Number(row.shipping), total: Number(row.total),
  items: [...(row.items ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(({ sort_order: _, ...item }) => ({ ...item, unit_price: Number(item.unit_price) })),
});

export const fetchMyOrders = (session: UserSession) =>
  request<OrderRow[]>(`/rest/v1/orders?user_id=eq.${encodeURIComponent(session.userId)}&select=${ORDER_SELECT}&order=created_at.desc`, {}, session.accessToken).then(rows => (rows ?? []).map(orderFromRow));

export const fetchOrders = (token: string) =>
  request<OrderRow[]>(`/rest/v1/orders?select=${ORDER_SELECT}&order=created_at.desc&limit=500`, {}, token).then(rows => (rows ?? []).map(orderFromRow));

export async function saveOrder(order: OrderDraft, token: string) {
  const input = { ...order, customer_name: order.customer_name.trim(), customer_email: order.customer_email.trim(), receipt_number: order.receipt_number.trim() };
  return request<number>("/rest/v1/rpc/admin_save_order", { method: "POST", body: JSON.stringify({ input }) }, token);
}
