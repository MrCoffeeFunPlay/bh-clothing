import { FormEvent, useMemo, useState } from "react";
import { BadgeCheck, CircleDollarSign, ClipboardList, FileText, Gift, MessageCircle, Package, Settings, ShoppingBag, Ticket, Truck, Users } from "lucide-react";
import { products, type Product } from "./catalog";
import { supabaseEnabled } from "./supabase";

type Panel = "overview" | "catalog" | "site" | "coupons" | "orders" | "faq";
type SiteSettings = {
  supportEmail: string;
  whatsapp: string;
  pointsPerDollar: string;
  pointValue: string;
  defaultLanguage: "en" | "he";
  welcomeDiscount: string;
};

type Coupon = { code: string; amount: string; kind: "percent" | "fixed"; active: boolean; uses: number; expires: string };
const storageKey = "bh-owner-settings-v1";
const couponKey = "bh-owner-coupons-v1";
const defaults: SiteSettings = { supportEmail: "hello@bhclothing.com", whatsapp: "", pointsPerDollar: "1", pointValue: "0.05", defaultLanguage: "en", welcomeDiscount: "10" };
const defaultCoupons: Coupon[] = [{ code: "WELCOME10", amount: "10", kind: "percent", active: true, uses: 0, expires: "No expiry" }];
const defaultFaqs = [
  ["Where do you ship?", "Countries and final delivery price appear at checkout."],
  ["Can I combine discount codes?", "No. The checkout accepts one eligible coupon and gives the customer the best valid offer."],
  ["How do BH Points work?", "Points are added after eligible paid orders and can be redeemed later."],
];

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}

export function OwnerPanel() {
  const [tab, setTab] = useState<Panel>("overview");
  const [settings, setSettings] = useState<SiteSettings>(() => read(storageKey, defaults));
  const [coupons, setCoupons] = useState<Coupon[]>(() => read(couponKey, defaultCoupons));
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("All");
  const [newCoupon, setNewCoupon] = useState({ code: "", amount: "10", kind: "percent" as Coupon["kind"], expires: "No expiry" });
  const [faqs, setFaqs] = useState(defaultFaqs);
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.category)))], []);
  const listed = products.filter((product) => filter === "All" || product.category === filter);
  const saveSettings = (event: FormEvent) => { event.preventDefault(); localStorage.setItem(storageKey, JSON.stringify(settings)); setNotice("Site settings saved locally. They will sync to Supabase as soon as its keys are connected."); };
  const addCoupon = (event: FormEvent) => {
    event.preventDefault();
    const code = newCoupon.code.trim().toUpperCase();
    if (!code || coupons.some((coupon) => coupon.code === code)) { setNotice("Use a unique coupon code."); return; }
    const next = [{ ...newCoupon, code, active: true, uses: 0 }, ...coupons];
    setCoupons(next); localStorage.setItem(couponKey, JSON.stringify(next)); setNewCoupon({ code: "", amount: "10", kind: "percent", expires: "No expiry" }); setNotice(`${code} is ready to share.`);
  };
  const toggleCoupon = (code: string) => { const next = coupons.map((coupon) => coupon.code === code ? { ...coupon, active: !coupon.active } : coupon); setCoupons(next); localStorage.setItem(couponKey, JSON.stringify(next)); };
  const nav: Array<[Panel, typeof ShoppingBag, string]> = [["overview", ClipboardList, "Overview"], ["catalog", ShoppingBag, "Catalog"], ["site", Settings, "Site settings"], ["coupons", Ticket, "Coupons"], ["orders", FileText, "Orders & receipts"], ["faq", MessageCircle, "FAQ & assistant"]];

  return <section className="owner-panel">
    <div className="owner-head"><div><p className="eyebrow">BH ADMIN / OWNER AREA</p><h1>Control<br/><em>room</em><span>.</span></h1><p>Store controls are grouped by job, not scattered through the catalog.</p></div><span className={supabaseEnabled ? "owner-status live" : "owner-status"}>{supabaseEnabled ? "Supabase connected" : "Local mode · Supabase setup pending"}</span></div>
    <div className="owner-shell"><aside>{nav.map(([key, Icon, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={17}/>{label}</button>)}</aside><div className="owner-workspace">{notice && <p className="owner-notice"><BadgeCheck size={16}/>{notice}</p>}
      {tab === "overview" && <><div className="owner-metrics"><article><ShoppingBag/><small>Catalog products</small><strong>{products.length}</strong><span>5 categories</span></article><article><Ticket/><small>Active coupons</small><strong>{coupons.filter((coupon) => coupon.active).length}</strong><span>One code per order</span></article><article><CircleDollarSign/><small>Welcome offer</small><strong>{settings.welcomeDiscount}%</strong><span>New registered users</span></article><article><Truck/><small>Shipping</small><strong>Setup</strong><span>Zones and rates next</span></article></div><div className="owner-setup"><h2>What is live next<span>.</span></h2><p>Once Supabase is connected, this panel writes products, users, coupons, order records, receipts and the site settings into the database with owner-only permissions.</p><div><span><Users/> Accounts</span><span><Package/> Inventory</span><span><Gift/> Points</span></div></div></>}
      {tab === "catalog" && <><div className="owner-section-head"><div><p className="eyebrow"><ShoppingBag size={14}/> CATALOG</p><h2>Products by category<span>.</span></h2></div><select value={filter} onChange={(event) => setFilter(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="owner-products">{listed.map((product: Product) => <article key={product.id}><img src={product.image} alt=""/><div><b>{product.name}</b><small>{product.category} · {product.color}</small><span>{product.cottonWeights?.length ? product.cottonWeights.join(" / ") : "Standard configuration"}</span></div><button onClick={() => setNotice(`${product.name} is ready to manage in the catalog editor.`)}>Manage</button></article>)}</div><p className="owner-footnote">Product editing and image uploads are already prepared in the existing catalog manager. Database saving activates after Supabase is connected.</p></>}
      {tab === "site" && <><div className="owner-section-head"><div><p className="eyebrow"><Settings size={14}/> STOREFRONT SETTINGS</p><h2>Contact, points & language<span>.</span></h2></div></div><form className="owner-form" onSubmit={saveSettings}><label>Support email<input type="email" value={settings.supportEmail} onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}/></label><label>WhatsApp number<input value={settings.whatsapp} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} placeholder="972... (numbers only)"/></label><label>Points per $1 spent<input min="0" step="0.1" type="number" value={settings.pointsPerDollar} onChange={(event) => setSettings({ ...settings, pointsPerDollar: event.target.value })}/></label><label>Value per point ($)<input min="0" step="0.01" type="number" value={settings.pointValue} onChange={(event) => setSettings({ ...settings, pointValue: event.target.value })}/></label><label>Welcome discount (%)<input min="1" max="100" type="number" value={settings.welcomeDiscount} onChange={(event) => setSettings({ ...settings, welcomeDiscount: event.target.value })}/></label><label>Default language<select value={settings.defaultLanguage} onChange={(event) => setSettings({ ...settings, defaultLanguage: event.target.value as "en" | "he" })}><option value="en">English</option><option value="he">עברית</option></select></label><div className="owner-rule"><b>Promotion rule</b><p>A customer gets one welcome coupon on registration. Checkout stores one coupon per order, so discounts cannot stack.</p></div><button className="glow-button">Save site settings</button></form></>}
      {tab === "coupons" && <><div className="owner-section-head"><div><p className="eyebrow"><Ticket size={14}/> COUPONS</p><h2>Give offers cleanly<span>.</span></h2></div></div><form className="coupon-form" onSubmit={addCoupon}><label>Code<input required value={newCoupon.code} onChange={(event) => setNewCoupon({ ...newCoupon, code: event.target.value })} placeholder="BHFRIEND15"/></label><label>Discount<input required min="1" type="number" value={newCoupon.amount} onChange={(event) => setNewCoupon({ ...newCoupon, amount: event.target.value })}/></label><label>Type<select value={newCoupon.kind} onChange={(event) => setNewCoupon({ ...newCoupon, kind: event.target.value as Coupon["kind"] })}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select></label><label>Expiry<input value={newCoupon.expires} onChange={(event) => setNewCoupon({ ...newCoupon, expires: event.target.value })} placeholder="No expiry"/></label><button className="glow-button">Create coupon</button></form><div className="coupon-list">{coupons.map((coupon) => <article key={coupon.code}><div><b>{coupon.code}</b><small>{coupon.kind === "percent" ? `${coupon.amount}% off` : `$${coupon.amount} off`} · {coupon.expires}</small></div><span>{coupon.uses} uses</span><button className={coupon.active ? "coupon-active" : ""} onClick={() => toggleCoupon(coupon.code)}>{coupon.active ? "Active" : "Paused"}</button></article>)}</div></>}
      {tab === "orders" && <><div className="owner-section-head"><div><p className="eyebrow"><FileText size={14}/> ORDERS & RECEIPTS</p><h2>Ready for real checkout<span>.</span></h2></div></div><div className="owner-empty"><FileText size={31}/><h3>No live orders yet.</h3><p>The database already has secured tables for orders, items, payment events, delivery tracking and receipt files. A payment provider webhook writes here only after verified payment.</p></div></>}
      {tab === "faq" && <><div className="owner-section-head"><div><p className="eyebrow"><MessageCircle size={14}/> FAQ & BH ASSISTANT</p><h2>Answers first<span>.</span></h2></div></div><div className="faq-editor">{faqs.map(([question, answer], index) => <article key={index}><input value={question} onChange={(event) => setFaqs(faqs.map((item, itemIndex) => itemIndex === index ? [event.target.value, item[1]] : item))}/><textarea value={answer} onChange={(event) => setFaqs(faqs.map((item, itemIndex) => itemIndex === index ? [item[0], event.target.value] : item))}/></article>)}</div><button className="glow-button" onClick={() => setNotice("FAQ changes are ready to save to Supabase after it is connected.")}>Save FAQ & assistant knowledge</button></>}
    </div></div>
  </section>;
}
