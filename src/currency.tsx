import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Product } from "./catalog";

import { formatMoney, productAmount, productOriginalAmount, emptySale, type Sale, type Currency } from "./pricing";
export { formatMoney, productAmount } from "./pricing";
const CurrencyContext = createContext({ currency: "ILS" as Currency, setCurrency: (_value: Currency) => {}, storeSale: emptySale(), setStoreSale: (_sale: Sale) => {}, now: Date.now() });
const ISRAEL_TIME_ZONES = ["Asia/Jerusalem", "Asia/Tel_Aviv"];
export function guessCurrency(): Currency {
  try { return ISRAEL_TIME_ZONES.includes(Intl.DateTimeFormat().resolvedOptions().timeZone) ? "ILS" : "USD"; } catch { return "ILS"; }
}
export function CurrencyProvider({ children }: { children: ReactNode }) {
  // A visitor's own choice always wins. Until they choose, Israel sees shekels and everyone else dollars (worked out
  // from the device's time zone, so no location permission or outside service is needed).
  const [currency, setValue] = useState<Currency>(() => {
    try { const chosen = localStorage.getItem("bh-currency"); if (chosen === "USD" || chosen === "ILS") return chosen; } catch { /* no storage: guess below */ }
    return guessCurrency();
  });
  const [storeSale, setSale] = useState<Sale>(() => {
    try { return { ...emptySale(), ...JSON.parse(localStorage.getItem("bh-store-sale-v1") || "{}") }; } catch { return emptySale(); }
  });
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const setStoreSale = (sale: Sale) => {
    setSale(sale);
    setNow(Date.now());
    try { localStorage.setItem("bh-store-sale-v1", JSON.stringify(sale)); } catch { /* Preview still works without storage. */ }
  };
  const setCurrency = (value: Currency) => {
    setValue(value);
    try { localStorage.setItem("bh-currency", value); } catch { /* Selection still works without browser storage. */ }
  };
  return <CurrencyContext.Provider value={{ currency, setCurrency, storeSale, setStoreSale, now }}>{children}</CurrencyContext.Provider>;
}
export const useCurrency = () => useContext(CurrencyContext);
export function ProductPrice({ product, weight }: { product: Product; weight?: "220g" | "260g" }) {
  const { currency, now } = useCurrency();
  const amount = productAmount(product, currency, weight, now);
  const original = productOriginalAmount(product, currency, weight);
  return <span className="product-price">{amount === null ? "Coming soon" : <>{original !== null && amount < original && <del aria-label="Original price">{formatMoney(original, currency)}</del>}<span>{formatMoney(amount, currency)}</span>{original !== null && amount < original && <small className="sale-price-badge">Sale</small>}</>}</span>;
}
export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  return <select className="currency-select" aria-label="Currency" value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option value="ILS">₪ ILS</option><option value="USD">$ USD</option></select>;
}
