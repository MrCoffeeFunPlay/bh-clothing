// Owner area → Activity log, Coupons and FAQ: all saved in the live store database.
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, CircleHelp, Clock, Eye, EyeOff, FileText, History, KeyRound, Languages, LogIn, Pencil, Plus, Search,
  ShoppingBag, Tags, Ticket, Trash2, UserPlus, Workflow, X,
} from "lucide-react";
import {
  activityCategories, deleteCoupon, deleteFaq, fetchActivity, fetchCoupons, fetchFaq, saveCoupon, saveFaq,
  type ActivityCategory, type ActivityEntry, type Coupon, type CouponDraft, type FaqDraft, type FaqItem, type UserSession,
} from "./catalogStore";

type Fresh = () => Promise<UserSession | null>;
type Banner = { ok: boolean; text: string };
const messageOf = (problem: unknown) => problem instanceof Error ? problem.message : String(problem);

// The same small helper every tool uses: a fresh token, a busy flag and a banner for the result.
function useOwnerRun(freshSession?: Fresh) {
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const run = async (work: (token: string) => Promise<void>) => {
    setBusy(true); setBanner(null);
    try { const active = await freshSession!(); if (!active) throw new Error("Your session ended. Please sign in again."); await work(active.accessToken); }
    catch (problem) { setBanner({ ok: false, text: messageOf(problem) }); }
    finally { setBusy(false); }
  };
  const bannerView = banner && <p className={banner.ok ? "save-banner save-ok" : "save-banner save-fail"} role={banner.ok ? "status" : "alert"}>{banner.ok ? <Check size={17}/> : <X size={17}/>}{banner.text}</p>;
  return { busy, run, setBanner, bannerView };
}

const offline = (title: string, icon: ReactNode, what: string) => <><div className="workspace-head"><div><p className="eyebrow">{icon} {title.toUpperCase()}</p><h2>{title}<span>.</span></h2></div></div><p className="admin-copy">{what} are saved in the live store database. Sign in to the live store to manage them.</p></>;

// ---- Activity log -------------------------------------------------------------------------------------------------
export const activityInfo: Record<ActivityCategory, { label: string; icon: typeof Clock }> = {
  orders: { label: "Orders", icon: ShoppingBag },
  sign_ins: { label: "Sign-ins", icon: LogIn },
  accounts: { label: "New accounts", icon: UserPlus },
  catalog: { label: "Catalogue", icon: Tags },
  coupons: { label: "Coupons", icon: Ticket },
  members: { label: "Member tags", icon: KeyRound },
  automations: { label: "Automations", icon: Workflow },
  content: { label: "FAQ & content", icon: CircleHelp },
  papers: { label: "Terms & privacy", icon: FileText },
};
const dayLabel = (iso: string) => {
  const day = new Date(iso); const today = new Date(); const yesterday = new Date(Date.now() - 86400000);
  if (day.toDateString() === today.toDateString()) return "Today";
  if (day.toDateString() === yesterday.toDateString()) return "Yesterday";
  return day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function ActivityLog({ freshSession }: { freshSession?: Fresh }) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [more, setMore] = useState(false);
  const { busy, run, bannerView } = useOwnerRun(freshSession);
  const PAGE = 60;
  const load = (reset: boolean, which = category, text = search) => run(async (token) => {
    const before = reset ? undefined : entries?.[entries.length - 1]?.id;
    const page = await fetchActivity(token, { category: which === "all" ? undefined : which, before, search: text, limit: PAGE });
    setEntries(reset ? page : [...(entries ?? []), ...page]);
    setMore(page.length === PAGE);
  });
  useEffect(() => { if (freshSession) void load(true); }, []);
  if (!freshSession) return offline("Activity log", <History size={14}/>, "Activity records");
  const pick = (next: ActivityCategory | "all") => { setCategory(next); void load(true, next); };
  const days = (entries ?? []).reduce<[string, ActivityEntry[]][]>((groups, entry) => {
    const label = dayLabel(entry.created_at); const last = groups[groups.length - 1];
    if (last && last[0] === label) last[1].push(entry); else groups.push([label, [entry]]);
    return groups;
  }, []);
  return <div className="activity-log">
    <div className="workspace-head"><div><p className="eyebrow"><History size={14}/> ACTIVITY LOG</p><h2>Everything that happened<span>.</span></h2></div></div>
    <p className="admin-copy">A record kept by the database itself: orders, sign-ins, new accounts, catalogue and price changes, coupons, member tags, automations, FAQ and the terms and privacy papers. Entries can't be edited or deleted.</p>
    {bannerView}
    <div className="activity-filters" role="tablist" aria-label="Show">
      <button className={category === "all" ? "active" : ""} onClick={() => pick("all")}>All</button>
      {activityCategories.map((key) => { const { label, icon: Icon } = activityInfo[key]; return <button key={key} className={category === key ? "active" : ""} onClick={() => pick(key)}><Icon size={14}/> {label}</button>; })}
    </div>
    <form className="tag-search" onSubmit={(event) => { event.preventDefault(); void load(true); }}><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search: an order number, a product, an email…" aria-label="Search the activity log"/><button className="ghost-pill" disabled={busy}>Search</button></form>
    {entries === null ? <p className="admin-copy">Loading…</p> : entries.length === 0 ? <p className="admin-copy">Nothing here yet.</p> : days.map(([label, list]) => <section key={label} className="activity-day">
      <h3>{label}</h3>
      {list.map((entry) => { const { label: categoryLabel, icon: Icon } = activityInfo[entry.category]; return <article key={entry.id} className={`activity-row cat-${entry.category}`}>
        <span className="activity-icon"><Icon size={17}/></span>
        <div><b>{entry.action}</b><p>{entry.summary}</p><small>{categoryLabel}{entry.actor_email ? <> · by {entry.actor_email}</> : <> · by the system</>}</small></div>
        <time dateTime={entry.created_at}>{timeLabel(entry.created_at)}</time>
      </article>; })}
    </section>)}
    {more && <button className="ghost-pill activity-more" disabled={busy} onClick={() => void load(false)}>{busy ? "Loading…" : "Show older"}</button>}
  </div>;
}

// ---- Coupons ------------------------------------------------------------------------------------------------------
const blankCoupon = (): CouponDraft => ({ code: "", kind: "percent", amount: 10, currency: "ILS", active: true, starts_at: null, expires_at: null, max_uses: null, per_customer_limit: 1, note: "" });
const dateInput = (iso: string | null) => iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const fromDateInput = (value: string) => value ? new Date(value).toISOString() : null;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const couponValue = (coupon: Pick<Coupon, "kind" | "amount" | "currency">) => coupon.kind === "percent" ? `${coupon.amount}% off` : `${coupon.currency === "USD" ? "$" : "₪"}${coupon.amount} off`;
function couponState(coupon: Coupon): [string, string] {
  const now = Date.now();
  if (!coupon.active) return ["Paused", "paused"];
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) return ["Ended", "ended"];
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return ["Scheduled", "scheduled"];
  if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) return ["Used up", "ended"];
  return ["Active", "active"];
}

export function CouponsAdmin({ freshSession }: { freshSession?: Fresh }) {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [draft, setDraft] = useState<CouponDraft | null>(null);
  const { busy, run, setBanner, bannerView } = useOwnerRun(freshSession);
  const reload = async (token: string) => setCoupons(await fetchCoupons(token));
  useEffect(() => { if (freshSession) void run(reload); }, []);
  if (!freshSession) return offline("Coupons", <Ticket size={14}/>, "Coupons");
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (!draft) return;
    if (draft.expires_at && draft.starts_at && draft.expires_at <= draft.starts_at) { setBanner({ ok: false, text: "The end date must be after the start date." }); return; }
    void run(async (token) => { const saved = await saveCoupon(draft, token); await reload(token); setDraft(null); setBanner({ ok: true, text: `${saved.code} has been saved.` }); });
  };
  const toggle = (coupon: Coupon) => void run(async (token) => { await saveCoupon({ ...coupon, active: !coupon.active }, token); await reload(token); });
  const remove = (coupon: Coupon) => {
    if (!window.confirm(`Delete ${coupon.code}? It can't be used after this.`)) return;
    void run(async (token) => { await deleteCoupon(coupon.id, token); await reload(token); setBanner({ ok: true, text: `${coupon.code} was deleted.` }); });
  };
  const limitInput = (value: number | null, set: (value: number | null) => void, label: string, hint: string) => <label>{label}<input type="number" min="1" step="1" value={value ?? ""} placeholder="No limit" onChange={(event) => set(event.target.value ? Math.max(1, Math.round(Number(event.target.value))) : null)}/><small>{hint}</small></label>;
  return <div className="coupons-admin">
    <div className="workspace-head"><div><p className="eyebrow"><Ticket size={14}/> COUPONS</p><h2>Give offers cleanly<span>.</span></h2></div>{!draft && <button className="glow-button" onClick={() => { setDraft(blankCoupon()); setBanner(null); }}><Plus size={16}/> New coupon</button>}</div>
    <p className="admin-copy">Each coupon has its own dates and limits: e.g. <b>BH</b> for everyone with no limit, <b>BH50</b> for the first 50 uses only, or <b>BHMORE</b> that the same customer can use again and again. Codes will be checked at checkout once payments open.</p>
    {bannerView}
    {draft && <form className="create-item-form coupon-editor" onSubmit={submit}>
      <label>Code<input required pattern="[A-Za-z0-9][A-Za-z0-9_\-]{2,29}" title="3–30 letters, numbers, - or _" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase().replace(/\s+/g, "") })} placeholder="BHFRIEND15"/></label>
      <label>Discount<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as Coupon["kind"] })}><option value="percent">Percent off</option><option value="fixed">Fixed amount off</option></select></label>
      <label>{draft.kind === "percent" ? "Percent" : "Amount"}<input type="number" required min="0.01" max={draft.kind === "percent" ? 100 : undefined} step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}/></label>
      {draft.kind === "fixed" && <label>Currency<select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as Coupon["currency"] })}><option value="ILS">₪ ILS</option><option value="USD">$ USD</option></select></label>}
      <label>Starts<input type="datetime-local" value={dateInput(draft.starts_at)} onChange={(event) => setDraft({ ...draft, starts_at: fromDateInput(event.target.value) })}/><small>Empty: from now</small></label>
      <label>Ends<input type="datetime-local" value={dateInput(draft.expires_at)} onChange={(event) => setDraft({ ...draft, expires_at: fromDateInput(event.target.value) })}/><small>Empty: never ends</small></label>
      {limitInput(draft.max_uses, (max_uses) => setDraft({ ...draft, max_uses }), "Total uses", "For everyone together, e.g. 50 = the first 50 orders")}
      {limitInput(draft.per_customer_limit, (per_customer_limit) => setDraft({ ...draft, per_customer_limit }), "Uses per customer", "Empty: as many times as they like")}
      <label className="wide">Note (only you see it)<input maxLength={200} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="e.g. Instagram giveaway"/></label>
      <div className="wide tag-form-actions"><button className="glow-button" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save coupon" : "Create coupon"} <Check size={16}/></button><button type="button" className="ghost-pill" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <div className="coupon-cards">{coupons === null ? <p className="admin-copy">Loading coupons…</p> : coupons.length === 0 ? <p className="admin-copy">No coupons yet.</p> : coupons.map((coupon) => {
      const [state, tone] = couponState(coupon);
      return <article key={coupon.id} className={`coupon-card ${tone}`}>
        <div className="coupon-top"><b>{coupon.code}</b><span className={`coupon-state ${tone}`}>{state}</span></div>
        <strong>{couponValue(coupon)}</strong>
        <dl>
          <div><dt>Created</dt><dd>{shortDate(coupon.created_at)}</dd></div>
          <div><dt>Starts</dt><dd>{coupon.starts_at ? shortDate(coupon.starts_at) : "Now"}</dd></div>
          <div><dt>Ends</dt><dd>{coupon.expires_at ? shortDate(coupon.expires_at) : "Never"}</dd></div>
          <div><dt>Used</dt><dd>{coupon.times_used}{coupon.max_uses !== null ? ` / ${coupon.max_uses}` : " · no limit"}</dd></div>
          <div><dt>Per customer</dt><dd>{coupon.per_customer_limit === null ? "Unlimited" : coupon.per_customer_limit === 1 ? "Once" : `${coupon.per_customer_limit} times`}</dd></div>
        </dl>
        {coupon.note && <p className="coupon-note">{coupon.note}</p>}
        <div className="coupon-actions"><button className="ghost-pill" disabled={busy} onClick={() => toggle(coupon)}>{coupon.active ? "Pause" : "Switch on"}</button><button className="icon" aria-label={`Edit ${coupon.code}`} onClick={() => { setDraft({ ...coupon }); setBanner(null); }}><Pencil size={16}/></button><button className="icon" aria-label={`Delete ${coupon.code}`} onClick={() => remove(coupon)}><Trash2 size={16}/></button></div>
      </article>;
    })}</div>
  </div>;
}

// ---- FAQ ----------------------------------------------------------------------------------------------------------
const blankFaq = (order: number): FaqDraft => ({ question: "", answer: "", question_he: "", answer_he: "", sort_order: order, active: true });

export function FaqAdmin({ freshSession }: { freshSession?: Fresh }) {
  const [items, setItems] = useState<FaqItem[] | null>(null);
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const { busy, run, setBanner, bannerView } = useOwnerRun(freshSession);
  const reload = async (token: string) => setItems(await fetchFaq(token));
  useEffect(() => { if (freshSession) void run(reload); }, []);
  const nextOrder = useMemo(() => Math.max(0, ...(items ?? []).map((item) => item.sort_order)) + 10, [items]);
  if (!freshSession) return offline("FAQ", <CircleHelp size={14}/>, "Questions");
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (!draft) return;
    void run(async (token) => { await saveFaq(draft, token); await reload(token); setDraft(null); setBanner({ ok: true, text: "The question has been saved. It's on the FAQ page now." }); });
  };
  const update = (item: FaqItem, change: Partial<FaqItem>, done: string) => void run(async (token) => { await saveFaq({ ...item, ...change }, token); await reload(token); setBanner({ ok: true, text: done }); });
  const move = (index: number, step: -1 | 1) => {
    const list = items ?? []; const other = list[index + step]; const item = list[index]; if (!other || !item) return;
    void run(async (token) => { await saveFaq({ ...item, sort_order: other.sort_order }, token); await saveFaq({ ...other, sort_order: item.sort_order }, token); await reload(token); });
  };
  const remove = (item: FaqItem) => {
    if (!window.confirm(`Remove "${item.question}" from the FAQ?`)) return;
    void run(async (token) => { await deleteFaq(item.id, token); await reload(token); setBanner({ ok: true, text: "The question was removed." }); });
  };
  return <div className="faq-admin">
    <div className="workspace-head"><div><p className="eyebrow"><CircleHelp size={14}/> FAQ</p><h2>Answers first<span>.</span></h2></div>{!draft && <button className="glow-button" onClick={() => { setDraft(blankFaq(nextOrder)); setBanner(null); }}><Plus size={16}/> New question</button>}</div>
    <p className="admin-copy">These questions appear on the FAQ page for everyone. Hidden ones stay saved here. The Hebrew version is optional; when it's empty, Hebrew readers see the English one.</p>
    {bannerView}
    {draft && <form className="create-item-form faq-form" onSubmit={submit}>
      <label className="wide">Question<input required minLength={3} maxLength={200} value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} placeholder="e.g. How do sizes fit?"/></label>
      <label className="wide">Answer<textarea required maxLength={2000} rows={4} value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: event.target.value })}/></label>
      <label className="wide">Question in Hebrew (optional)<input dir="rtl" maxLength={200} value={draft.question_he} onChange={(event) => setDraft({ ...draft, question_he: event.target.value })}/></label>
      <label className="wide">Answer in Hebrew (optional)<textarea dir="rtl" maxLength={2000} rows={3} value={draft.answer_he} onChange={(event) => setDraft({ ...draft, answer_he: event.target.value })}/></label>
      <div className="wide tag-form-actions"><button className="glow-button" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save question" : "Add question"} <Check size={16}/></button><button type="button" className="ghost-pill" onClick={() => setDraft(null)}>Cancel</button></div>
    </form>}
    <div className="faq-admin-list">{items === null ? <p className="admin-copy">Loading questions…</p> : items.length === 0 ? <p className="admin-copy">No questions yet.</p> : items.map((item, index) => <article key={item.id} className={item.active ? "" : "hidden-question"}>
      <div><b>{item.question}</b><p>{item.answer}</p>{!item.active && <small><EyeOff size={12}/> Hidden from the FAQ page</small>}{item.question_he && <small><Languages size={12}/> Hebrew version added</small>}</div>
      <div className="faq-admin-actions">
        <button className="icon" aria-label="Move up" disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp size={15}/></button>
        <button className="icon" aria-label="Move down" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15}/></button>
        <button className="icon" aria-label={item.active ? "Hide" : "Show"} disabled={busy} onClick={() => update(item, { active: !item.active }, item.active ? "The question is hidden." : "The question is shown again.")}>{item.active ? <Eye size={15}/> : <EyeOff size={15}/>}</button>
        <button className="icon" aria-label="Edit" onClick={() => { setDraft({ ...item }); setBanner(null); }}><Pencil size={15}/></button>
        <button className="icon" aria-label="Remove" onClick={() => remove(item)}><Trash2 size={15}/></button>
      </div>
    </article>)}</div>
  </div>;
}
