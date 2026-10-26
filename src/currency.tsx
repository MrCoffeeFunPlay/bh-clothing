import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "./catalog";

import { formatMoney, productAmount, type Currency } from "./pricing";
export { formatMoney, productAmount } from "./pricing";
const CurrencyContext = createContext({ currency: "ILS" as Currency, setCurrency: (_value: Currency) => {} });
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setValue] = useState<Currency>(() => {
    try { return localStorage.getItem("bh-currency") === "USD" ? "USD" : "ILS"; } catch { return "ILS"; }
  });
  const setCurrency = (value: Currency) => {
    setValue(value);
    try { localStorage.setItem("bh-currency", value); } catch { /* Selection still works without browser storage. */ }
  };
  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}
export const useCurrency = () => useContext(CurrencyContext);
export function ProductPrice({ product, weight }: { product: Product; weight?: "220g" | "260g" }) {
  const { currency } = useCurrency();
  const amount = productAmount(product, currency, weight);
  return <>{amount === null ? "Coming soon" : formatMoney(amount, currency)}</>;
}
export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  return <select className="currency-select" aria-label="Currency" value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option value="ILS">₪ ILS</option><option value="USD">$ USD</option></select>;
}
