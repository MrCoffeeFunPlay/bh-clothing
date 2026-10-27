// Owner area → Automations: rules ("hasn't signed in for 30 days") with the message each matching member gets.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { renderEmail } from "./emailTemplate";
import { Bell, Cake, Check, Clock, Info, Mail, Pencil, Plus, ShoppingBag, Trash2, UserPlus, Workflow, X } from "lucide-react";
import {
  automationReach, automationTriggers, deleteAutomation, fetchAutomations, saveAutomation,
  type Automation, type AutomationDraft, type AutomationTrigger, type UserSession,
} from "./catalogStore";

type Fresh = () => Promise<UserSession | null>;
type Banner = { ok: boolean; text: string };

// usesDays: the rule waits a number of days. ready: the store has the data to know who matches.
export const triggerInfo: Record<AutomationTrigger, { label: string; sentence: (days: number) => string; icon: typeof Mail; usesDays: boolean; ready: boolean }> = {
  welcome: { label: "Right after sign-up", sentence: () => "Right after someone creates an account", icon: UserPlus, usesDays: false, ready: true },
  no_sign_in: { label: "Hasn't signed in for…", sentence: (days) => `When a member hasn't signed in for ${days} days`, icon: Clock, usesDays: true, ready: true },
  no_order: { label: "Hasn't ordered for…", sentence: (days) => `When a member hasn't ordered for ${days} days`, icon: ShoppingBag, usesDays: true, ready: false },
  birthday: { label: "On their birthday", sentence: () => "On the member's birthday", icon: Cake, usesDays: false, ready: true },
  cart_left: { label: "Left items in the bag for…", sentence: (days) => `When items stay in the bag for ${days} days`, icon: ShoppingBag, usesDays: true, ready: false },
};

const placeholders = ["{first_name}", "{days}", "{coupon}", "{store_link}"] as const;

// What the member would read, with the placeholders filled in.
export function fillMessage(text: string, automation: Pick<Automation, "days" | "coupon_code">, firstName: string, storeLink: string) {
  const values: Record<(typeof placeholders)[number], string> = { "{first_name}": firstName || "there", "{days}": String(automation.days), "{coupon}": automation.coupon_code || "(no code)", "{store_link}": storeLink };
  return placeholders.reduce((filled, token) => filled.split(token).join(values[token]), text);
}

const blank = (): AutomationDraft => ({ name: "", trigger: "no_sign_in", days: 30, channel: "email", subject: "", body: "Hi {first_name},\n\n", coupon_code: "", button_label: "Visit BH Clothing", marketing: true, active: false });

// The designed email in a frame, sized to its content: exactly what the member will receive.
function EmailPreview({ draft, sample, storeLink }: { draft: AutomationDraft; sample: string; storeLink: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const shown = { ...draft, coupon_code: draft.coupon_code.trim().toUpperCase() }; // codes are saved in capitals
  const html = renderEmail({ subject: fillMessage(shown.subject || "Subject", shown, sample, storeLink), body: fillMessage(shown.body, shown, sample, "{store_link}"), buttonLabel: shown.button_label, couponCode: shown.coupon_code, storeLink, marketing: shown.marketing });
  const fit = () => { const page = frame.current?.contentDocument?.body; if (page && frame.current) frame.current.style.height = `${page.scrollHeight + 4}px`; };
  return <aside className="email-preview" aria-label="Email preview"><p className="eyebrow"><Mail size={13}/> PREVIEW · TO {sample.toUpperCase()} (EXAMPLE MEMBER)</p><iframe ref={frame} title="Email preview" srcDoc={html} onLoad={fit} sandbox="allow-same-origin"/></aside>;
}

export function AutomationsAdmin({ freshSession }: { freshSession?: Fresh }) {
  const sample = "Dana"; // the preview shows the message as an example member would read it
  const [items, setItems] = useState<Automation[] | null>(null);
  const [reach, setReach] = useState<Record<number, number | null>>({});
  const [draft, setDraft] = useState<AutomationDraft | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (work: (token: string) => Promise<void>) => {
    setBusy(true); setBanner(null);
    try { const active = await freshSession!(); if (!active) throw new Error("Your session ended. Please sign in again."); await work(active.accessToken); }
    catch (problem) { setBanner({ ok: false, text: problem instanceof Error ? problem.message : String(problem) }); }
    finally { setBusy(false); }
  };
  const reload = async (token: string) => {
    const next = await fetchAutomations(token); setItems(next);
    const counts = await Promise.all(next.map((item) => triggerInfo[item.trigger].ready ? automationReach(item.trigger, item.days, item.marketing, token).catch(() => null) : Promise.resolve(null)));
    setReach(Object.fromEntries(next.map((item, index) => [item.id, counts[index]])));
  };
  useEffect(() => { if (freshSession) void run(reload); }, []);
  // Editing opens the editor where the automation is; bring it into view.
  const editor = useRef<HTMLFormElement>(null);
  useEffect(() => { if (draft) editor.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }, [draft?.id, draft === null]);
  const head = <><div className="workspace-head"><div><p className="eyebrow"><Workflow size={14}/> AUTOMATIONS</p><h2>Messages on autopilot<span>.</span></h2></div>{freshSession && <button className="glow-button" onClick={() => { setDraft(blank()); setBanner(null); }}><Plus size={16}/> Create automation</button>}</div>
    <p className="automation-note"><Info size={16}/> <span>Choose when a message goes out and write what it says. <b>Nothing is sent yet:</b> sending starts once an email service is connected. Switched-on automations will then run once a day.</span></p></>;
  if (!freshSession) return <>{head}<p className="admin-copy">Automations are saved in the live store database. Sign in to the live store to manage them.</p></>;
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (!draft) return;
    void run(async (token) => { const saved = await saveAutomation(draft, token); await reload(token); setDraft(null); setBanner({ ok: true, text: `"${saved.name}" has been saved.` }); });
  };
  const toggle = (item: Automation) => void run(async (token) => { await saveAutomation({ ...item, active: !item.active }, token); await reload(token); setBanner({ ok: true, text: `"${item.name}" is ${item.active ? "switched off" : "switched on"}.` }); });
  const remove = (item: Automation) => {
    if (!window.confirm(`Delete the "${item.name}" automation?`)) return;
    void run(async (token) => { await deleteAutomation(item.id, token); await reload(token); setBanner({ ok: true, text: `"${item.name}" was deleted.` }); });
  };
  const insert = (token: string) => draft && setDraft({ ...draft, body: draft.body + token });
  const storeLink = typeof window === "undefined" ? "" : window.location.origin;
  const editorForm = draft && <form ref={editor} className="automation-editor" onSubmit={submit}>
      <div className="create-item-form automation-form">
        <label>Automation name<input required maxLength={60} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. We miss you"/></label>
        <label>When<select value={draft.trigger} onChange={(event) => { const trigger = event.target.value as AutomationTrigger; setDraft({ ...draft, trigger, days: triggerInfo[trigger].usesDays ? draft.days || 30 : 0 }); }}>{automationTriggers.map((trigger) => <option key={trigger} value={trigger}>{triggerInfo[trigger].label}</option>)}</select></label>
        {triggerInfo[draft.trigger].usesDays && <label>Days<input type="number" min={1} max={365} required value={draft.days} onChange={(event) => setDraft({ ...draft, days: Number(event.target.value) })}/></label>}
        <label>Button text<input required maxLength={40} value={draft.button_label} onChange={(event) => setDraft({ ...draft, button_label: event.target.value })} placeholder="e.g. See what's new"/></label>
        <label>Coupon code (optional)<input maxLength={40} value={draft.coupon_code} onChange={(event) => setDraft({ ...draft, coupon_code: event.target.value })} placeholder="e.g. BACK10"/></label>
        <label className="wide">Email subject<input required maxLength={120} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} placeholder="e.g. {first_name}, it's been a while"/></label>
        <label className="wide">Message<textarea required maxLength={4000} rows={8} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })}/></label>
        <div className="wide placeholder-row"><span>Add to the message:</span>{placeholders.map((token) => <button type="button" key={token} className="ghost-pill" onClick={() => insert(token)}>{token}</button>)}</div>
        {!triggerInfo[draft.trigger].ready && <p className="wide automation-warning">This rule needs online orders and saved bags, which the store doesn't have yet. You can prepare it now.</p>}
        <label className="wide automation-switch"><input type="checkbox" checked={draft.marketing} onChange={(event) => setDraft({ ...draft, marketing: event.target.checked })}/> Marketing message: only for members who chose to get BH updates (adds an unsubscribe link)</label>
        <label className="wide automation-switch"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })}/> Switched on</label>
        <div className="wide tag-form-actions"><button className="glow-button" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save automation" : "Create automation"} <Check size={16}/></button><button type="button" className="ghost-pill" onClick={() => setDraft(null)}>Cancel</button></div>
      </div>
      <EmailPreview draft={draft} sample={sample} storeLink={storeLink}/>
    </form>;
  return <div className="automations">
    {head}
    {banner && <p className={banner.ok ? "save-banner save-ok" : "save-banner save-fail"} role={banner.ok ? "status" : "alert"}>{banner.ok ? <Check size={17}/> : <X size={17}/>}{banner.text}</p>}
    {draft && !draft.id && editorForm}
    <div className="automation-list">{items === null ? <p className="admin-copy">Loading automations…</p> : items.length === 0 ? <p className="admin-copy">No automations yet. Create your first one.</p> : items.map((item) => { const info = triggerInfo[item.trigger]; const Icon = info.icon; const count = reach[item.id]; return draft?.id === item.id ? <div key={item.id}>{editorForm}</div> : <article key={item.id} className={item.active ? "on" : ""}>
      <span className="icon-orb"><Icon size={19}/></span>
      <div><h3>{item.name}</h3><p>{info.sentence(item.days)} · Email{item.marketing && <span className="marketing-flag"><Bell size={11}/> Updates only</span>}</p><small>{!info.ready ? "Needs online orders" : count == null ? "" : `${count} ${count === 1 ? "member matches" : "members match"} today${item.marketing ? " (with updates on)" : ""}`}</small></div>
      <button className={item.active ? "switch active" : "switch"} disabled={busy} onClick={() => toggle(item)} aria-label={`${item.active ? "Switch off" : "Switch on"} ${item.name}`}><i/></button>
      <button className="ghost-pill" onClick={() => { setDraft({ ...item }); setBanner(null); }}><Pencil size={14}/> Edit</button>
      <button className="ghost-pill danger" onClick={() => remove(item)}><Trash2 size={14}/> Delete</button>
    </article>; })}</div>
  </div>;
}
