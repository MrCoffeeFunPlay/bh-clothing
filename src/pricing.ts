import type { Product } from "./catalog";
export type Currency = "USD" | "ILS";
export const formatMoney = (amount: number, currency: Currency) => new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
// Independent price lists: do not invent an exchange rate or a launch price.
export function productAmount(product: Product, currency: Currency, weight = product.selectedWeight || product.cottonWeights?.[0]) {
  const validPrice = (amount: number | null | undefined) => typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? amount : null;
  if (product.gsmPrices) return validPrice(weight ? product.gsmPrices[weight]?.[currency] : null);
  if (product.prices) return validPrice(product.prices[currency]);
  if (currency !== "USD" || !/^\$\d+(\.\d+)?$/.test(product.price)) return null;
  return validPrice(Number(product.price.slice(1)));
}
