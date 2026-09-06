/**
 * Minimal Supabase browser client without a service-role key.
 *
 * Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit Secrets. The
 * database migration owns all security rules; this file intentionally never
 * contains an admin key or payment secret.
 */
const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(baseUrl && anonKey);

type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
};

const headers = (accessToken?: string) => ({
  apikey: anonKey || "",
  Authorization: `Bearer ${accessToken || anonKey || ""}`,
  "Content-Type": "application/json",
});

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!supabaseEnabled) throw new Error("Supabase is not configured yet.");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: headers(accessToken),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Supabase request failed.");
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const bhAuth = {
  async signUp(email: string, password: string, profile: Record<string, string>) {
    return request<{ user: AuthSession["user"]; session: AuthSession | null }>("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, data: profile }),
    });
  },
  async signIn(email: string, password: string) {
    return request<AuthSession>("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async getProfile(accessToken: string) {
    const rows = await request<Array<Record<string, unknown>>>("/rest/v1/profiles?select=*&id=eq." + encodeURIComponent(JSON.parse(atob(accessToken.split(".")[1])).sub), {}, accessToken);
    return rows[0] || null;
  },
};

export const bhStore = {
  settings: (accessToken?: string) => request<Array<Record<string, unknown>>>("/rest/v1/storefront_settings?select=*", {}, accessToken),
  faqs: (accessToken?: string) => request<Array<Record<string, unknown>>>("/rest/v1/faq_entries?select=*&active=eq.true&order=sort_order", {}, accessToken),
  categories: (accessToken?: string) => request<Array<Record<string, unknown>>>("/rest/v1/storefront_categories?select=*&active=eq.true&order=sort_order", {}, accessToken),
};
