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
  sale_starts_at: string | null; sale_ends_at: string | null; active: boolean; sort_order: number;
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
    id: row.id, slug: row.slug, active: row.active, name: row.name,
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
  if (/email not confirmed/i.test(text)) return "Confirm your email first: enter the code we sent you.";
  if (/already registered|already exists/i.test(text)) return "An account with this email already exists. Log in instead.";
  if (/expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(text)) return "That code is wrong or has expired. Check the email or send a new code.";
  if (/rate limit|too many|security purposes/i.test(text)) return "Too many attempts. Please wait a minute and try again.";
  if (/password/i.test(text) && /(at least|weak|short)/i.test(text)) return "Choose a stronger password (at least 8 characters).";
  if (status === 401 || status === 403 || /permission denied|row-level security|authorised/i.test(text)) return "You don't have permission to do this. Sign in again.";
  return text || `The store database answered with an error (${status}).`;
};

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

// Creates the account. With email confirmation on (the BH setting), no session is returned until the code is entered.
export async function signUp(email: string, password: string, details: Record<string, string>, remember = true) {
  const answer = await request<Partial<TokenAnswer>>("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: details }) });
  return answer.access_token && answer.refresh_token && answer.user ? keep(toSession(answer as TokenAnswer, remember)) : null;
}

export async function verifySignupCode(email: string, code: string, remember = true) {
  const answer = await request<TokenAnswer>("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "signup", email, token: code.trim() }) });
  return keep(toSession(answer, remember))!;
}

export const resendSignupCode = (email: string) =>
  request("/auth/v1/resend", { method: "POST", body: JSON.stringify({ type: "signup", email }) });

export async function currentSession(): Promise<UserSession | null> {
  let stored: UserSession | null = null;
  for (const store of stores()) {
    try { stored = JSON.parse(store.getItem(SESSION_KEY) || "null"); } catch { stored = null; }
    if (stored) break;
  }
  if (!stored?.refreshToken) return null;
  if (stored.expiresAt - Date.now() > 60_000) return stored;
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
export type Profile = { first_name: string; last_name: string; username: string; birthday: string | null; country: string };
export const emptyProfile = (): Profile => ({ first_name: "", last_name: "", username: "", birthday: null, country: "" });

export async function fetchProfile(session: UserSession): Promise<Profile | null> {
  const rows = await request<Profile[]>(`/rest/v1/profiles?id=eq.${encodeURIComponent(session.userId)}&select=first_name,last_name,username,birthday,country`, {}, session.accessToken);
  return rows?.[0] ?? null;
}

export async function saveProfile(session: UserSession, profile: Profile): Promise<Profile> {
  const rows = await request<Profile[]>("/rest/v1/profiles?on_conflict=id&select=first_name,last_name,username,birthday,country", {
    method: "POST", body: JSON.stringify({ id: session.userId, ...profile, birthday: profile.birthday || null }),
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  }, session.accessToken);
  if (!rows?.[0]) throw new CatalogError("Your details were not saved. Please try again.");
  return rows[0];
}
