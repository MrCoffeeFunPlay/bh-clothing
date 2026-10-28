// The bag as lines (piece + colour + size + fabric + quantity). Members' bags are saved in their account; a visitor's
// bag is kept in this browser and moves into their account when they sign in.
import type { Product } from "./catalog";
import type { BagLine } from "./catalogStore";

const GUEST_KEY = "bh-bag-v1";
const key = (line: Omit<BagLine, "quantity">) => [line.product_id, line.colour, line.size, line.fabric_weight].join("|");

export const lineOf = (item: Product): BagLine => ({ product_id: item.id, colour: item.color || "", size: item.selectedSize ?? "", fabric_weight: item.selectedWeight ?? "", quantity: 1 });

// Add lines together: the same piece (same colour, size and fabric) becomes one line with the quantities added.
export function mergeLines(...groups: BagLine[][]): BagLine[] {
  const merged = new Map<string, BagLine>();
  for (const line of groups.flat()) {
    const found = merged.get(key(line));
    merged.set(key(line), found ? { ...found, quantity: Math.min(99, found.quantity + line.quantity) } : { ...line, quantity: Math.min(99, Math.max(1, line.quantity)) });
  }
  return [...merged.values()];
}

// One unit less of the piece at this position in the bag list.
export function removeUnit(lines: BagLine[], item: Product): BagLine[] {
  const target = key(lineOf(item));
  return lines.flatMap((line) => key(line) !== target ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []);
}

// The bag as the store shows it: one entry per unit, with today's catalogue details (and prices). Pieces that are no
// longer in the store (hidden or coming soon) are skipped but kept in the saved bag.
export function bagItems(lines: BagLine[], catalogue: Product[]): Product[] {
  return lines.flatMap((line) => {
    const product = catalogue.find((item) => item.id === line.product_id);
    if (!product || product.comingSoon) return [];
    const item: Product = { ...product, color: line.colour || product.color, image: (line.colour && product.colorImages?.[line.colour]) || product.image,
      selectedSize: line.size || undefined, selectedWeight: (line.fabric_weight || undefined) as Product["selectedWeight"] };
    return Array.from({ length: line.quantity }, () => item);
  });
}

export function readGuestBag(): BagLine[] {
  try { const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); return Array.isArray(saved) ? mergeLines(saved) : []; } catch { return []; }
}
export function writeGuestBag(lines: BagLine[]) {
  try { if (lines.length) localStorage.setItem(GUEST_KEY, JSON.stringify(lines)); else localStorage.removeItem(GUEST_KEY); } catch { /* private mode: the bag lasts for this visit */ }
}
