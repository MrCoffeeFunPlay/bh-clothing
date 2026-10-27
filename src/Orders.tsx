// Orders: what a member sees in their account, and the owner's order book. No payment provider or receipts service is
// connected yet: orders recorded here are test orders or unpaid orders. Payment status and receipts are shown but can
// only be set later by the provider integration (the database refuses them from the website).
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ExternalLink, FileText, MapPin, Package, Plus, ReceiptText, Search, Trash2, Truck, X } from "lucide-react";
import { products, type Product } from "./catalog";
import { formatMoney, productAmount } from "./pricing";
import {
  fetchMyOrders, fetchOrders, orderStatuses, saveOrder,
  type Order, type OrderDraft, type OrderItem, type OrderStatus, type PaymentStatus, type UserSession,
} from "./catalogStore";

type Fresh = () => Promise<UserSession | null>;
type Banner = { ok: boolean; text: string };

export const statusLabel: Record<OrderStatus, string> = { new: "New", processing: "Being prepared", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", returned: "Returned" };
const paymentLabel: Record<PaymentStatus, string> = { unpaid: "Not paid", paid: "Paid", refunded: "Refunded" };
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
const itemLine = (item: OrderItem) => [item.colour, item.size, item.fabric_weight && item.fabric_weight.replace("g", " GSM")].filter(Boolean).join(" · ");

function OrderItems({ order }: { order: Pick<Order, "items" | "currency"> }) {
  return <ul className="order-items">{order.items.map((item, index) => <li key={index}>{item.image ? <img src={item.image} alt=""/> : <span className="order-item-blank"><Package size={18}/></span>}<div><b>{item.product_name}</b><small>{itemLine(item)}{item.quantity > 1 ? ` · ×${item.quantity}` : ""}</small></div><span>{formatMoney(item.unit_price * item.quantity, order.currency)}</span></li>)}</ul>;
}

function OrderTotals({ order }: { order: Pick<Order, "subtotal" | "discount" | "shipping" | "total" | "currency"> }) {
  return <dl className="order-totals"><div><dt>Items</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>{order.discount > 0 && <div><dt>Discount</dt><dd>−{formatMoney(order.discount, order.currency)}</dd></div>}<div><dt>Shipping</dt><dd>{order.shipping > 0 ? formatMoney(order.shipping, order.currency) : "Free"}</dd></div><div className="grand"><dt>Total</dt><dd>{formatMoney(order.total, order.currency)}</dd></div></dl>;
}

// Account → Orders & shipments: the member's real orders.
export function MyOrders({ freshSession, go }: { freshSession: Fresh; go: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [problem, setProblem] = useState("");
  useEffect(() => { void (async () => { try { const active = await freshSession(); if (active) setOrders(await fetchMyOrders(active)); } catch (error) { setProblem(error instanceof Error ? error.message : String(error)); setOrders([]); } })(); }, []);
  const inTransit = orders?.filter((order) => order.status === "shipped").length ?? 0;
  return <><div className="panel-heading"><div><p className="eyebrow"><Truck size={14}/> ORDERS & SHIPMENTS</p><h2>Your orders<span>.</span></h2><p>Every order, its delivery status and its receipt in one place.</p></div>{inTransit > 0 && <span className="status-pill">{inTransit} on the way</span>}</div>
    {problem && <p className="save-banner save-fail" role="alert"><X size={17}/>{problem}</p>}
    {orders === null ? <p className="admin-copy">Loading your orders…</p> : orders.length === 0 ? <div className="orders-empty"><span className="icon-orb"><Package size={22}/></span><h3>No orders yet</h3><p>When you order, it will show up here with its status and receipt.</p><button className="glow-button" onClick={go}>Explore the store <ArrowRight size={16}/></button></div>
      : <div className="my-orders">{orders.map((order) => <article key={order.id}>
        <div className="order-head"><div><p className="eyebrow">ORDER {order.order_number} · {date(order.created_at)}</p><span className={`order-status ${order.status}`}>{statusLabel[order.status]}</span>{order.is_test && <span className="test-pill">Test order</span>}</div><strong>{formatMoney(order.total, order.currency)}</strong></div>
        <OrderItems order={order}/>
        <div className="order-foot">
          {order.tracking_number ? (order.tracking_url ? <a className="ghost-pill" href={order.tracking_url} target="_blank" rel="noreferrer"><MapPin size={15}/> Track {order.tracking_number}</a> : <span className="order-meta"><MapPin size={14}/> Tracking: {order.tracking_number}</span>) : <span className="order-meta"><Truck size={14}/> {order.status === "delivered" ? "Delivered" : "Tracking appears here once shipped"}</span>}
          {order.receipt_url ? <a className="ghost-pill" href={order.receipt_url} target="_blank" rel="noreferrer"><ReceiptText size={15}/> Receipt {order.receipt_number}</a> : <span className="order-meta"><ReceiptText size={14}/> {paymentLabel[order.payment_status]} · no receipt</span>}
        </div>
      </article>)}</div>}
  </>;
}

// New orders are test orders unless the owner unticks it; they are always unpaid.
const blankOrder = (): OrderDraft => ({ customer_name: "", customer_email: "", customer_phone: "", address_line: "", city: "", postal_code: "", country: "Israel", currency: "ILS", discount: 0, shipping: 0, status: "new", tracking_number: "", tracking_url: "", notes: "", is_test: true, items: [] });
const draftFrom = ({ id, customer_name, customer_email, customer_phone, address_line, city, postal_code, country, currency, discount, shipping, status, tracking_number, tracking_url, notes, is_test, items }: Order): OrderDraft =>
  ({ id, customer_name, customer_email, customer_phone, address_line, city, postal_code, country, currency, discount, shipping, status, tracking_number, tracking_url, notes, is_test, items: items.map((item) => ({ ...item })) });

// The store's price for a piece in the chosen currency (the owner can still change it).
type Weight = NonNullable<Product["selectedWeight"]>;
const priceOf = (product: Product, currency: "ILS" | "USD", weight?: string) => productAmount({ ...product, selectedWeight: weight as Weight | undefined }, currency, weight as Weight | undefined) ?? 0;

function ItemPicker({ currency, onAdd }: { currency: "ILS" | "USD"; onAdd: (item: OrderItem) => void }) {
  const sellable = products.filter((product) => !product.comingSoon);
  const [productId, setProductId] = useState(sellable[0]?.id ?? 0);
  const product = sellable.find((item) => item.id === productId);
  const colours = product ? Object.keys(product.colorImages ?? {}) : [];
  const weights = product?.cottonWeights ?? [];
  const [colour, setColour] = useState(""); const [size, setSize] = useState(""); const [weight, setWeight] = useState(""); const [quantity, setQuantity] = useState(1);
  useEffect(() => { setColour(colours[0] ?? ""); setSize(product?.sizes?.[1] ?? product?.sizes?.[0] ?? ""); setWeight(weights[0] ?? ""); }, [productId]);
  if (!product) return <p className="admin-copy">No products to add.</p>;
  const add = () => onAdd({ product_id: product.id, product_name: product.name, colour, size, fabric_weight: weight, quantity, unit_price: priceOf(product, currency, weight || undefined), image: product.colorImages?.[colour] ?? product.image });
  return <div className="item-picker">
    <label>Piece<select value={productId} onChange={(event) => setProductId(Number(event.target.value))}>{sellable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {colours.length > 0 && <label>Colour<select value={colour} onChange={(event) => setColour(event.target.value)}>{colours.map((name) => <option key={name}>{name}</option>)}</select></label>}
    {weights.length > 0 && <label>Fabric<select value={weight} onChange={(event) => setWeight(event.target.value)}>{weights.map((name) => <option key={name} value={name}>{name.replace("g", " GSM")}</option>)}</select></label>}
    {(product.sizes?.length ?? 0) > 0 && <label>Size<select value={size} onChange={(event) => setSize(event.target.value)}>{product.sizes!.map((name) => <option key={name}>{name}</option>)}</select></label>}
    <label>Qty<input type="number" min={1} max={99} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}/></label>
    <button type="button" className="ghost-pill" onClick={add}><Plus size={15}/> Add piece</button>
  </div>;
}

// Owner area → Orders & receipts.
export function OrdersAdmin({ freshSession }: { freshSession?: Fresh }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const run = async (work: (token: string) => Promise<void>) => {
    setBusy(true); setBanner(null);
    try { const active = await freshSession!(); if (!active) throw new Error("Your session ended. Please sign in again."); await work(active.accessToken); }
    catch (problem) { setBanner({ ok: false, text: problem instanceof Error ? problem.message : String(problem) }); }
    finally { setBusy(false); }
  };
  const reload = async (token: string) => setOrders(await fetchOrders(token));
  useEffect(() => { if (freshSession) void run(reload); }, []);
  useEffect(() => { top.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }, [draft === null, viewing]);
  const listed = useMemo(() => (orders ?? []).filter((order) => (filter === "all" || order.status === filter)
    && [order.order_number, order.customer_name, order.customer_email].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [orders, query, filter]);
  const head = <div className="workspace-head"><div><p className="eyebrow"><FileText size={14}/> ORDERS</p><h2>Order book<span>.</span></h2></div>{freshSession && !draft && <button className="glow-button" onClick={() => { setDraft(blankOrder()); setViewing(null); setBanner(null); }}><Plus size={16}/> Record an order</button>}</div>;
  const note = <p className="automation-note"><ReceiptText size={16}/> <span><b>Payments and receipts are not connected yet.</b> Orders here are test orders or unpaid orders. Payment status and receipts will be filled in automatically by the payment provider and the receipts service once they are chosen and connected; they can't be set by hand.</span></p>;
  if (!freshSession) return <div ref={top}>{head}{note}<p className="admin-copy">Orders are saved in the live store database. Sign in to the live store to see them.</p></div>;

  if (draft) {
    const sub = draft.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const total = sub - draft.discount + draft.shipping;
    const field = (key: "customer_name" | "customer_email" | "customer_phone" | "address_line" | "city" | "postal_code" | "country" | "tracking_number" | "tracking_url") =>
      ({ value: draft[key], onChange: (event: { target: { value: string } }) => setDraft({ ...draft, [key]: event.target.value }) });
    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (!draft.items.length) { setBanner({ ok: false, text: "Add at least one piece to the order." }); return; }
      if (total < 0) { setBanner({ ok: false, text: "The discount can't be more than the items plus shipping." }); return; }
      void run(async (token) => { const id = await saveOrder(draft, token); await reload(token); setDraft(null); setViewing(Number(id)); setBanner({ ok: true, text: draft.id ? "The order has been updated." : "The order has been recorded." }); });
    };
    return <div className="orders-admin" ref={top}>{head}
      {banner && <p className={banner.ok ? "save-banner save-ok" : "save-banner save-fail"} role={banner.ok ? "status" : "alert"}>{banner.ok ? <Check size={17}/> : <X size={17}/>}{banner.text}</p>}
      <form className="order-form" onSubmit={submit}>
        <fieldset><legend>Customer</legend>
          <label>Full name<input required maxLength={120} {...field("customer_name")}/></label>
          <label>Email<input type="email" maxLength={200} {...field("customer_email")} placeholder="Links the order to their BH account"/></label>
          <label>Phone<input type="tel" maxLength={40} {...field("customer_phone")}/></label>
        </fieldset>
        <fieldset><legend>Delivery address</legend>
          <label className="wide">Street and number<input maxLength={200} {...field("address_line")}/></label>
          <label>City<input maxLength={80} {...field("city")}/></label>
          <label>Postal code<input maxLength={20} {...field("postal_code")}/></label>
          <label>Country<input maxLength={60} {...field("country")}/></label>
        </fieldset>
        <fieldset className="order-pieces"><legend>Pieces</legend>
          <label className="currency-pick">Currency<select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as "ILS" | "USD" })}><option value="ILS">₪ ILS</option><option value="USD">$ USD</option></select></label>
          <ItemPicker currency={draft.currency} onAdd={(item) => setDraft({ ...draft, items: [...draft.items, item] })}/>
          {draft.items.length > 0 && <ul className="order-items editable">{draft.items.map((item, index) => <li key={index}>{item.image ? <img src={item.image} alt=""/> : <span className="order-item-blank"><Package size={18}/></span>}<div><b>{item.product_name}</b><small>{itemLine(item)} · ×{item.quantity}</small></div>
            <label>Price each<input type="number" min={0} step="0.01" value={item.unit_price} onChange={(event) => setDraft({ ...draft, items: draft.items.map((line, at) => at === index ? { ...line, unit_price: Math.max(0, Number(event.target.value) || 0) } : line) })} aria-label={`Price of ${item.product_name}`}/></label>
            <button type="button" className="icon-button" aria-label={`Remove ${item.product_name}`} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, at) => at !== index) })}><Trash2 size={15}/></button></li>)}</ul>}
          <div className="order-money">
            <label>Discount<input type="number" min={0} step="0.01" value={draft.discount} onChange={(event) => setDraft({ ...draft, discount: Math.max(0, Number(event.target.value) || 0) })}/></label>
            <label>Shipping<input type="number" min={0} step="0.01" value={draft.shipping} onChange={(event) => setDraft({ ...draft, shipping: Math.max(0, Number(event.target.value) || 0) })}/></label>
            <OrderTotals order={{ subtotal: sub, discount: draft.discount, shipping: draft.shipping, total, currency: draft.currency }}/>
          </div>
        </fieldset>
        <fieldset><legend>Status & delivery</legend>
          <label>Order status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OrderStatus })}>{orderStatuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></label>
          <label>Tracking number<input maxLength={80} {...field("tracking_number")}/></label>
          <label>Tracking link<input type="url" maxLength={500} {...field("tracking_url")} placeholder="https://"/></label>
          <p className="wide fieldset-help">Payment: <b>Not paid</b>. Payments and receipts aren't connected yet, so this order stays unpaid and has no receipt.</p>
          <label className="wide test-choice"><input type="checkbox" checked={draft.is_test} onChange={(event) => setDraft({ ...draft, is_test: event.target.checked })}/> Test order (not a real sale)</label>
          <label className="wide">Private notes<textarea maxLength={2000} rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })}/></label>
        </fieldset>
        <div className="tag-form-actions"><button className="glow-button" disabled={busy}>{busy ? "Saving…" : draft.id ? "Save order" : "Record order"} <Check size={16}/></button><button type="button" className="ghost-pill" onClick={() => setDraft(null)}>Cancel</button></div>
      </form>
    </div>;
  }

  const order = orders?.find((item) => item.id === viewing);
  if (order) return <div className="orders-admin" ref={top}>{head}
    {banner && <p className={banner.ok ? "save-banner save-ok" : "save-banner save-fail"} role={banner.ok ? "status" : "alert"}>{banner.ok ? <Check size={17}/> : <X size={17}/>}{banner.text}</p>}
    <button className="back" onClick={() => { setViewing(null); setBanner(null); }}><ChevronLeft size={17}/> All orders</button>
    <div className="order-detail">
      <div className="order-head"><div><p className="eyebrow">{date(order.created_at)} · {order.source === "manual" ? "Recorded by hand" : "Website"}</p><h3>{order.order_number}</h3><span className={`order-status ${order.status}`}>{statusLabel[order.status]}</span> <span className={`payment-status ${order.payment_status}`}>{paymentLabel[order.payment_status]}</span>{order.is_test && <span className="test-pill">Test order</span>}</div><button className="glow-button" onClick={() => { setDraft(draftFrom(order)); setBanner(null); }}>Edit order <ArrowRight size={16}/></button></div>
      <div className="order-detail-grid">
        <section><h4>Customer</h4><p><b>{order.customer_name}</b><br/>{order.customer_email || "No email"}{order.customer_phone && <><br/>{order.customer_phone}</>}</p><h4>Delivery</h4><p>{[order.address_line, [order.postal_code, order.city].filter(Boolean).join(" "), order.country].filter(Boolean).join(", ") || "No address"}</p>{order.tracking_number && <p>Tracking: {order.tracking_url ? <a href={order.tracking_url} target="_blank" rel="noreferrer">{order.tracking_number} <ExternalLink size={12}/></a> : order.tracking_number}</p>}</section>
        <section><h4>Pieces</h4><OrderItems order={order}/><OrderTotals order={order}/></section>
        <section><h4>Payment & receipt</h4>{order.payment_reference ? <p>{order.payment_provider} · {order.payment_reference}</p> : <p className="muted">Not paid. Payments aren't connected yet.</p>}{order.receipt_number || order.receipt_url ? <p>{order.receipt_url ? <a href={order.receipt_url} target="_blank" rel="noreferrer">Receipt {order.receipt_number || ""} <ExternalLink size={12}/></a> : `Receipt ${order.receipt_number}`}</p> : <p className="muted">No receipt. Receipts will come from the receipts service once it's connected.</p>}{order.notes && <><h4>Notes</h4><p className="order-notes">{order.notes}</p></>}</section>
      </div>
    </div>
  </div>;

  return <div className="orders-admin" ref={top}>{head}{note}
    {banner && <p className={banner.ok ? "save-banner save-ok" : "save-banner save-fail"} role={banner.ok ? "status" : "alert"}>{banner.ok ? <Check size={17}/> : <X size={17}/>}{banner.text}</p>}
    <div className="order-filters"><label className="tag-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number, name or email" aria-label="Search orders"/></label><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter by status"><option value="all">All statuses</option>{orderStatuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></div>
    {orders === null ? <p className="admin-copy">Loading orders…</p> : orders.length === 0 ? <p className="admin-copy">No orders yet. Record your first one with "Record an order".</p> : listed.length === 0 ? <p className="admin-copy">No orders match.</p>
      : <div className="order-table">{listed.map((item) => <button key={item.id} onClick={() => { setViewing(item.id); setBanner(null); }}><span><b>{item.order_number}</b><small>{date(item.created_at)}</small></span><span><b>{item.customer_name}</b><small>{item.items.length} {item.items.length === 1 ? "piece" : "pieces"}</small></span><span className={`order-status ${item.status}`}>{statusLabel[item.status]}</span><span className={`payment-status ${item.payment_status}`}>{paymentLabel[item.payment_status]}</span><span className="receipt-cell">{item.is_test ? <span className="test-pill">Test</span> : item.receipt_number ? <><ReceiptText size={14}/> {item.receipt_number}</> : <small>No receipt</small>}</span><strong>{formatMoney(item.total, item.currency)}</strong></button>)}</div>}
  </div>;
}
