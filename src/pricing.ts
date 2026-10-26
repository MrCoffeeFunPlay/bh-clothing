import type { Product } from "./catalog";
export type Currency = "USD" | "ILS";
export type Sale = { enabled: boolean; title: string; kind: "percent" | "amount"; value: number; currency: Currency; startsAt: string; endsAt: string };
export const emptySale = (): Sale => ({ enabled: false, title: "", kind: "percent", value: 15, currency: "ILS", startsAt: "", endsAt: "" });
export const formatMoney = (amount: number, currency: Currency) => new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
export const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
export function saleActive(sale: Sale | undefined, currency: Currency, now = Date.now()): boolean {
  if (!sale?.enabled || !Number.isFinite(sale.value) || sale.value <= 0 || (sale.kind !== "percent" && sale.kind !== "amount") || (sale.kind === "percent" && sale.value > 100)) return false;
  if (sale.kind === "amount" && sale.currency !== currency) return false;
  const start = sale.startsAt ? Date.parse(sale.startsAt) : -Infinity;
  const end = sale.endsAt ? Date.parse(sale.endsAt) : Infinity;
  return !Number.isNaN(start) && !Number.isNaN(end) && start < end && now >= start && now < end;
}
export function saleAmount(original: number, sale: Sale | undefined, currency: Currency, now = Date.now()): number {
  if (!saleActive(sale, currency, now)) return original;
  return money(Math.max(0, original - (sale!.kind === "percent" ? original * sale!.value / 100 : sale!.value)));
}
export function productOriginalAmount(product: Product, currency: Currency, weight = product.selectedWeight || product.cottonWeights?.[0]) {
  const validPrice = (amount: number | null | undefined) => typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? money(amount) : null;
  if (product.gsmPrices) return validPrice(weight ? product.gsmPrices[weight]?.[currency] : null);
  if (product.prices) return validPrice(product.prices[currency]);
  if (currency !== "USD" || !/^\$\d+(\.\d+)?$/.test(product.price)) return null;
  return validPrice(Number(product.price.slice(1)));
}
// Converts an ILS price to USD at the given rate and rounds up to the next .99 (35.69 -> 35.99).
export const usdFromIls = (ils: number, rate: number) => money(Math.floor(money(ils / rate)) + 0.99);
// A fixed sale price set per fabric weight and currency; only used while it is below the original price.
export function productSalePrice(product: Product, currency: Currency, weight = product.selectedWeight || product.cottonWeights?.[0]) {
  const original = productOriginalAmount(product, currency, weight);
  const sale = weight ? product.gsmSalePrices?.[weight]?.[currency] : null;
  return original !== null && typeof sale === "number" && Number.isFinite(sale) && sale > 0 && sale < original ? money(sale) : null;
}
export function productAmount(product: Product, currency: Currency, weight = product.selectedWeight || product.cottonWeights?.[0], now = Date.now()) {
  const original = productOriginalAmount(product, currency, weight);
  if (original === null) return null;
  // One product discount only: an active timed product sale (from the original price) temporarily replaces the
  // fixed sale price; when it ends or is stopped, the fixed sale price applies again.
  if (saleActive(product.sale, currency, now)) return saleAmount(original, product.sale, currency, now);
  return productSalePrice(product, currency, weight) ?? original;
}
export function cartTotals(items: Product[], currency: Currency, sale?: Sale, now = Date.now()) {
  const amounts = items.map(item => productAmount(item, currency, undefined, now));
  if (amounts.some(amount => amount === null)) return { subtotal: null, discount: null, total: null };
  const subtotal = money(amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0));
  const total = saleAmount(subtotal, sale, currency, now);
  return { subtotal, discount: money(subtotal - total), total };
}
