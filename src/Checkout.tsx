// Checkout: delivery details, the order summary with one coupon code, and the payment step. Payments are not open yet,
// so the pay button stays locked: nothing is charged and no order is placed from here.
import { type FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, LockKeyhole, ShieldCheck, Tag, Ticket, Truck, UserRound, X } from "lucide-react";
import type { Product } from "./catalog";
import { checkCoupon, emptyDelivery, fetchDelivery, saveDelivery, type CouponCheck, type CouponReason, type Delivery, type UserSession } from "./catalogStore";
import { formatMoney, orderTotals, type AppliedCoupon, type Currency, type Sale } from "./pricing";
import { ProductPrice } from "./currency";

type Fresh = () => Promise<UserSession | null>;

const COUPON_KEY = "bh-coupon-v1";
export const readCoupon = (): AppliedCoupon | null => {
  try { const saved = JSON.parse(sessionStorage.getItem(COUPON_KEY) || "null"); return saved && typeof saved.code === "string" ? saved : null; } catch { return null; }
};
export const keepCoupon = (coupon: AppliedCoupon | null) => {
  try { if (coupon) sessionStorage.setItem(COUPON_KEY, JSON.stringify(coupon)); else sessionStorage.removeItem(COUPON_KEY); } catch { /* private browsing */ }
};

const reasonText: Record<CouponReason, string> = {
  unknown: "We couldn't find this code. Check the spelling.",
  paused: "This code isn't active right now.",
  not_started: "This code isn't active yet.",
  ended: "This code has expired.",
  used_up: "This code has been fully used.",
  sign_in: "This code is once per customer: sign in to use it.",
  already_used: "You've already used this code.",
  currency: "This code works only on prices in another currency. Switch the currency to use it.",
};
const couponLabel = (coupon: AppliedCoupon) => coupon.kind === "percent" ? `${coupon.amount}% off` : `${formatMoney(coupon.amount, coupon.currency)} off`;

export type Totals = ReturnType<typeof orderTotals>;

// One code per order. The database checks the code (dates, limits, currency); checking doesn't use it up.
export function CouponBox({ coupon, setCoupon, currency, totals, freshSession, signedIn, openAuth }: { coupon: AppliedCoupon | null; setCoupon: (coupon: AppliedCoupon | null) => void; currency: Currency; totals: Totals; freshSession: Fresh; signedIn: boolean; openAuth: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CouponReason | "offline" | null>(null);
  const apply = (event: FormEvent) => {
    event.preventDefault(); if (!code.trim() || totals.subtotal === null) return;
    setBusy(true); setProblem(null);
    void (async () => {
      try {
        const session = signedIn ? await freshSession() : null;
        const answer: CouponCheck = await checkCoupon(code, currency, totals.subtotal!, session?.accessToken);
        if (answer.ok) { const applied = { code: answer.code, kind: answer.kind, amount: answer.amount, currency: answer.currency }; setCoupon(applied); keepCoupon(applied); setCode(""); }
        else setProblem(answer.reason);
      } catch { setProblem("offline"); }
      finally { setBusy(false); }
    })();
  };
  if (coupon) return <div className="coupon-box">
    <div className="coupon-applied"><Ticket size={16}/><b>{coupon.code}</b><span>{couponLabel(coupon)}</span><button type="button" className="icon" aria-label="Remove code" onClick={() => { setCoupon(null); keepCoupon(null); }}><X size={15}/></button></div>
    {totals.couponProblem === "currency" && <p className="coupon-message">This code works only on prices in another currency. Switch the currency to use it.</p>}
    {totals.offer === "store" && !totals.couponProblem && <p className="coupon-message">Your store sale already saves more, so the code isn't added on top. One offer per order.</p>}
  </div>;
  return <form className="coupon-box" onSubmit={apply}>
    <label htmlFor="coupon-code"><Tag size={14}/> Discount code</label>
    <div className="coupon-row"><input id="coupon-code" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setProblem(null); }} placeholder="Enter a code" autoComplete="off" maxLength={30}/><button className="ghost-pill" disabled={busy || !code.trim()}>{busy ? "Checking…" : "Apply"}</button></div>
    {problem && <p className="coupon-message error" role="alert">{problem === "offline" ? "We couldn't check the code. Check the connection and try again." : reasonText[problem]}{problem === "sign_in" && <> <button type="button" className="text-link" onClick={openAuth}>Sign in</button></>}</p>}
  </form>;
}

export function SummaryLines({ totals, currency, coupon, storeSale }: { totals: Totals; currency: Currency; coupon: AppliedCoupon | null; storeSale: Sale }) {
  const show = (amount: number | null) => amount === null ? "Coming soon" : formatMoney(amount, currency);
  return <>
    <div><span>Subtotal</span><b>{show(totals.subtotal)}</b></div>
    {totals.offer === "store" && <div className="sale-saving"><span>{storeSale.title || "Store sale"}</span><b>−{formatMoney(totals.storeDiscount!, currency)}</b></div>}
    {totals.offer === "coupon" && coupon && <div className="sale-saving"><span>Code {coupon.code}</span><b>−{formatMoney(totals.couponDiscount!, currency)}</b></div>}
    <div><span>Shipping</span><small>Shown when delivery opens</small></div>
    <div className="summary-total"><span>Total before shipping</span><b>{show(totals.total)}</b></div>
  </>;
}

const fieldsDone = (delivery: Delivery, email: string) => Boolean(email.trim() && delivery.full_name.trim() && delivery.phone.trim() && delivery.city.trim() && delivery.street.trim() && delivery.country.trim());

export function CheckoutPage({ items, liveItems, coupon, setCoupon, currency, storeSale, now, session, freshSession, openAuth, go, openTerms }: {
  items: Product[]; liveItems: Product[]; coupon: AppliedCoupon | null; setCoupon: (coupon: AppliedCoupon | null) => void; currency: Currency; storeSale: Sale; now: number;
  session: UserSession | null; freshSession: Fresh; openAuth: () => void; go: (view: "cart" | "store") => void; openTerms: () => void;
}) {
  const totals = orderTotals(liveItems, currency, storeSale, coupon, now);
  const [delivery, setDelivery] = useState<Delivery>(emptyDelivery);
  const [email, setEmail] = useState(session?.email ?? "");
  const [agreed, setAgreed] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  useEffect(() => {
    if (!session) return;
    setEmail((current) => current || session.email);
    void (async () => { const active = await freshSession(); if (active) setDelivery(await fetchDelivery(active).catch(() => emptyDelivery())); })();
  }, [session?.userId]);
  const field = (key: keyof Delivery) => ({ value: delivery[key], onChange: (event: { target: { value: string } }) => { setDelivery({ ...delivery, [key]: event.target.value }); setSaved("idle"); } });
  const keep = () => { setSaved("saving"); void (async () => { try { const active = await freshSession(); if (!active) throw new Error(); await saveDelivery(active, delivery); setSaved("saved"); } catch { setSaved("failed"); } })(); };
  if (!items.length) return <section className="page checkout-page"><div className="empty-cart page-empty"><h2>Your bag is empty<span>.</span></h2><p>Add a piece to your bag to check out.</p><button className="primary" onClick={() => go("store")}>Explore Store <ArrowRight size={16}/></button></div></section>;
  const ready = fieldsDone(delivery, email) && agreed;
  return <section className="page checkout-page">
    <button className="back" onClick={() => go("cart")}><ChevronLeft size={17}/> Back to bag</button>
    <div className="intro"><p className="kicker">Checkout</p><h1>Almost<br/><em>yours</em><span>.</span></h1></div>
    <p className="checkout-notice" role="note"><LockKeyhole size={17}/><span><b>Payments aren't open yet.</b> You can fill in your details and check your total. You won't be charged and no order is placed.</span></p>
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
        {!session && <div className="checkout-signin"><UserRound size={18}/><span>Have an account? Sign in to use your saved details and member codes.</span><button type="button" className="ghost-pill" onClick={openAuth}>Sign in</button></div>}
        <fieldset><legend><span>1</span> Contact</legend>
          <label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com"/></label>
          <label>Full name<input required autoComplete="name" {...field("full_name")}/></label>
          <label>Phone<input type="tel" required autoComplete="tel" {...field("phone")} placeholder="+972 50 123 4567"/></label>
        </fieldset>
        <fieldset><legend><span>2</span> Delivery</legend>
          <label>Country<select autoComplete="country-name" {...field("country")}><option>Israel</option><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Germany</option><option>France</option><option>Other</option></select></label>
          <label>City<input required autoComplete="address-level2" {...field("city")}/></label>
          <label className="wide">Street and number<input required autoComplete="address-line1" {...field("street")}/></label>
          <label>Apartment, floor (optional)<input autoComplete="address-line2" {...field("apartment")}/></label>
          <label>Postal code<input autoComplete="postal-code" {...field("postal_code")}/></label>
          <label className="wide">Delivery notes (optional)<input maxLength={200} {...field("notes")} placeholder="e.g. Leave with the neighbour"/></label>
          {session && <div className="wide checkout-save"><button type="button" className="ghost-pill" disabled={saved === "saving" || !fieldsDone(delivery, email)} onClick={keep}>{saved === "saving" ? "Saving…" : "Save these details to my account"}</button>{saved === "saved" && <span className="saved-note"><Check size={14}/> Saved for next time.</span>}{saved === "failed" && <span className="saved-note error">Not saved. Please try again.</span>}</div>}
          <p className="wide checkout-hint"><Truck size={15}/> Delivery options and their prices will appear here when delivery opens.</p>
        </fieldset>
        <fieldset><legend><span>3</span> Payment</legend>
          <div className="wide payment-locked"><ShieldCheck size={20}/><div><b>Secure payment opens soon</b><p>Payments will be handled by a licensed payment provider. BH never sees or stores your card number.</p></div></div>
        </fieldset>
      </form>
      <aside className="checkout-summary">
        <p>Order summary</p>
        <div className="checkout-items">{items.map((item, index) => <article key={item.id + "-checkout-" + index}><img loading="lazy" decoding="async" src={item.image} alt=""/><div><b>{item.name}</b><small>{item.color} · {item.selectedSize || "M"}{item.selectedWeight ? ` · ${item.selectedWeight.replace("g", " GSM")}` : ""}</small></div><ProductPrice product={liveItems[index]}/></article>)}</div>
        <CouponBox coupon={coupon} setCoupon={setCoupon} currency={currency} totals={totals} freshSession={freshSession} signedIn={Boolean(session)} openAuth={openAuth}/>
        <SummaryLines totals={totals} currency={currency} coupon={coupon} storeSale={storeSale}/>
        <label className="checkout-terms"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)}/> <span>I agree to the <button type="button" className="text-link" onClick={openTerms}>Terms & conditions</button> and the Privacy policy.</span></label>
        <button className="primary full" disabled title="Payments open soon"><LockKeyhole size={16}/> {ready ? "Pay — opens soon" : "Payments open soon"}</button>
        <small className="checkout-small">Nothing is charged. When payments open, this button will take you to the secure payment page.</small>
      </aside>
    </div>
  </section>;
}

// Account → Wallet & payments: what is real today. The delivery address can be saved and changed here; points and
// saved cards open with payments (cards are kept by the payment provider, never by BH).
export function WalletPanel({ freshSession, goClub }: { freshSession: Fresh; goClub: () => void }) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [draft, setDraft] = useState<Delivery | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  useEffect(() => { void (async () => { const active = await freshSession(); setDelivery(active ? await fetchDelivery(active).catch(() => emptyDelivery()) : emptyDelivery()); })(); }, []);
  const hasAddress = Boolean(delivery && delivery.street.trim() && delivery.city.trim());
  const field = (key: keyof Delivery) => ({ value: draft![key], onChange: (event: { target: { value: string } }) => setDraft({ ...draft!, [key]: event.target.value }) });
  const save = (event: FormEvent) => {
    event.preventDefault(); if (!draft) return; setState("saving");
    void (async () => { try { const active = await freshSession(); if (!active) throw new Error(); await saveDelivery(active, draft); setDelivery(draft); setDraft(null); setState("saved"); } catch { setState("failed"); } })();
  };
  return <div className="wallet-panel">
    <article><small>BH POINTS</small><strong>Soon</strong><span>Points start with the first paid orders.</span><button className="ghost-pill" onClick={goClub}>How BH Points work <ArrowRight size={15}/></button></article>
    <article><ShieldCheck size={24}/><div><small>PAYMENT METHODS</small><h3>Nothing saved</h3><p>Payments open soon. Cards will be kept by the licensed payment provider, never by BH.</p></div></article>
    <article className="wallet-address"><Truck size={24}/><div><small>DELIVERY ADDRESS</small>
      {delivery === null ? <p>Loading…</p> : draft ? <form className="wallet-address-form" onSubmit={save}>
        <label>Full name<input required autoComplete="name" {...field("full_name")}/></label>
        <label>Phone<input type="tel" required autoComplete="tel" {...field("phone")}/></label>
        <label>Country<select autoComplete="country-name" {...field("country")}><option>Israel</option><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Germany</option><option>France</option><option>Other</option></select></label>
        <label>City<input required autoComplete="address-level2" {...field("city")}/></label>
        <label>Street and number<input required autoComplete="address-line1" {...field("street")}/></label>
        <label>Apartment, floor (optional)<input autoComplete="address-line2" {...field("apartment")}/></label>
        <label>Postal code<input autoComplete="postal-code" {...field("postal_code")}/></label>
        <div className="wallet-address-actions"><button className="glow-button" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save address"} <Check size={15}/></button><button type="button" className="ghost-pill" onClick={() => setDraft(null)}>Cancel</button></div>
      </form> : hasAddress ? <><h3>{delivery.full_name || "Saved address"}</h3><p>{[delivery.street, delivery.apartment, delivery.city, delivery.postal_code, delivery.country].filter((part) => part.trim()).join(", ")}{delivery.phone ? <><br/>{delivery.phone}</> : null}</p></>
        : <><h3>No address yet</h3><p>Save it once and it's ready at checkout.</p></>}
      {state === "saved" && !draft && <span className="saved-note"><Check size={14}/> Saved.</span>}{state === "failed" && <span className="saved-note error">Not saved. Please try again.</span>}
    </div>{!draft && delivery !== null && <button className="ghost-pill" onClick={() => { setDraft({ ...delivery }); setState("idle"); }}>{hasAddress ? "Edit" : "Add address"} <ArrowRight size={15}/></button>}</article>
  </div>;
}
