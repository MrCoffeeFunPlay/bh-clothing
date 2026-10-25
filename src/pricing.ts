import type { Product } from "./catalog";
export type Currency = "USD" | "ILS";
export const formatMoney = (amount: number, currency: Currency) => new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
// Independent price lists: do not invent an exchange rate or a launch price.
export function productAmount(product: Product, currency: Currency, weight = product.selectedWeight || product.cottonWeights?.[0]) {
  if (product.gsmPrices) return weight ? product.gsmPrices[weight]?.[currency] ?? null : null;
  if (currency !== "USD" || !/^\$\d+(\.\d+)?$/.test(product.price)) return null;
  return Number(product.price.slice(1));
}
