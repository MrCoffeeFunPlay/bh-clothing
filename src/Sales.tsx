import { useState } from "react";
import { emptySale, saleActive, formatMoney, type Sale } from "./pricing";
import { useCurrency } from "./currency";

const localDate = (iso: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function SaleFields({ sale, onChange, requireEnd = false }: { sale: Sale; onChange: (sale: Sale) => void; requireEnd?: boolean }) {
  const [duration, setDuration] = useState("custom");
  const dateChange = (key: "startsAt" | "endsAt", value: string) => { setDuration("custom"); onChange({ ...sale, [key]: value ? new Date(value).toISOString() : "" }); };
  return <fieldset className="sale-fields"><legend>Sale settings</legend><label className="sale-toggle"><input type="checkbox" checked={sale.enabled} onChange={event => onChange({ ...sale, enabled: event.target.checked })}/> Enable sale</label><label>Sale title<input value={sale.title} onChange={event => onChange({ ...sale, title: event.target.value })} placeholder="NEW OPENING SALE"/></label><div className="sale-grid"><label>Discount type<select value={sale.kind} onChange={event => onChange({ ...sale, kind: event.target.value as Sale["kind"] })}><option value="percent">Percentage (%)</option><option value="amount">Fixed amount</option></select></label><label>{sale.kind === "percent" ? "Discount (%)" : "Discount amount"}<input type="number" min="0.01" max={sale.kind === "percent" ? 100 : undefined} step="0.01" required={sale.enabled} value={sale.value || ""} onChange={event => onChange({ ...sale, value: event.target.value === "" ? 0 : Number(event.target.value) })}/></label>{sale.kind === "amount" && <label>Discount currency<select value={sale.currency} onChange={event => onChange({ ...sale, currency: event.target.value as Sale["currency"] })}><option value="ILS">ILS (₪)</option><option value="USD">USD ($)</option></select></label>}<label>Duration<select value={duration} onChange={event => { const days = Number(event.target.value); setDuration(event.target.value); if (days) { const start = sale.startsAt ? new Date(sale.startsAt) : new Date(); onChange({ ...sale, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + days * 86400000).toISOString() }); } }}><option value="custom">Custom dates</option><option value="1">1 day</option><option value="7">1 week</option><option value="14">2 weeks</option><option value="30">30 days</option></select></label><label>Starts at (your local time)<input type="datetime-local" value={localDate(sale.startsAt)} onChange={event => dateChange("startsAt", event.target.value)}/></label><label>Ends at (your local time)<input type="datetime-local" required={requireEnd && sale.enabled} min={localDate(sale.startsAt)} value={localDate(sale.endsAt)} onChange={event => dateChange("endsAt", event.target.value)}/></label></div><small>Blank start means immediately. {requireEnd ? "Choose an end date for this store campaign." : "Blank end keeps this product sale active until you turn it off."} Fixed discounts apply only in the selected currency. Percentage discounts apply in both currencies when a price exists.</small></fieldset>;
}
export function saleError(sale: Sale, requireEnd = false) {
  if (!sale.enabled) return "";
  if (!Number.isFinite(sale.value) || sale.value <= 0 || (sale.kind === "percent" && sale.value > 100)) return "Enter a positive discount (up to 100% for percentages).";
  if (requireEnd && !sale.endsAt) return "Choose when this campaign ends.";
  if ((sale.startsAt && !Number.isFinite(Date.parse(sale.startsAt))) || (sale.endsAt && !Number.isFinite(Date.parse(sale.endsAt)))) return "Choose valid sale dates.";
  if (sale.endsAt && Date.parse(sale.endsAt) <= (sale.startsAt ? Date.parse(sale.startsAt) : Date.now())) return "The end must be after the start and in the future for an immediate sale.";
  return "";
}
export function StoreSalePanel() {
  const { storeSale, setStoreSale, currency, now } = useCurrency();
  const [draft, setDraft] = useState<Sale>(storeSale || emptySale);
  const [notice, setNotice] = useState("");
  return <section className="store-sale-panel"><h2>Store-wide sale</h2><p>Apply one discount to the whole bag after product discounts. The title appears in the announcement bar while the campaign is active.</p><p className="sale-preview-note">Preview settings are saved in this browser only. Shared store settings will be connected with the live backend.</p><form onSubmit={event => { event.preventDefault(); const error = saleError(draft, true); if (error) { setNotice(error); return; } setStoreSale({ ...draft, title: draft.title.trim() }); setNotice("Store sale saved in this browser."); }}><SaleFields sale={draft} onChange={setDraft} requireEnd/><div className="sale-actions"><button className="glow-button">Save store sale</button><button type="button" className="ghost-pill" onClick={() => { const stopped = { ...draft, enabled: false }; setDraft(stopped); setStoreSale(stopped); setNotice("Store sale stopped."); }}>Stop sale now</button></div></form><p role="status">{notice || (saleActive(storeSale, currency, now) ? "Campaign is active in the selected currency." : "No active campaign in the selected currency.")}</p></section>;
}
export function SaleAnnouncement() {
  const { storeSale, currency, now } = useCurrency();
  if (!saleActive(storeSale, currency, now)) return <>Explore the BH collection <span>•</span> Earn BH Points on every purchase</>;
  return <>{storeSale.title || "BH SALE"} <span>•</span> {storeSale.kind === "percent" ? `${storeSale.value}% off your bag` : `${formatMoney(storeSale.value, currency)} off your bag`} {storeSale.endsAt && <small> · Ends {new Date(storeSale.endsAt).toLocaleString()}</small>}</>;
}
