// Writes the SQL data part of the 2026-10-27 hoodies / coming-soon migration from src/catalog.ts.
// Usage: node tools/supabase/generate-catalog-update.ts
import { products } from "../../src/catalog.ts";

const q = (value: string | null | undefined) => value === null || value === undefined ? "null" : `'${value.replace(/'/g, "''")}'`;
const arr = (values: string[] | undefined) => values?.length ? `array[${values.map(q).join(", ")}]::text[]` : "'{}'::text[]";
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const colours = (product: (typeof products)[number]) => Object.keys(product.colorImages ?? {}).map((colour, order) =>
  `  (${product.id}, ${q(colour)}, ${q(product.colorHexes?.[colour] ?? "#8d8275")}, ${q(product.colorImages![colour])}, ${q(product.backImages?.[colour] ?? null)}, ${order})`).join(",\n");
const out: string[] = ["-- Hoodies: new front/back mockups, no model photos."];
for (const product of products.filter(item => item.category === "Hoodies")) {
  out.push(`update public.products set lookbook_images = '{}' where id = ${product.id};`,
    `delete from public.product_colours where product_id = ${product.id};`,
    "insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values", colours(product) + ";");
}
out.push("", "-- Coming soon: real products shown locked with a silhouette; no prices, no stock.");
for (const product of products.filter(item => item.comingSoon)) {
  out.push(`insert into public.products (id, slug, name, category_slug, description, tag, sizes, fabric_weights, coming_soon, active, sort_order)`,
    `overriding system value values (${product.id}, ${q(slug(product.name))}, ${q(product.name)}, ${q(slug(product.category === "Pants" ? "shorts" : product.category))}, ${q(product.description ?? "")}, ${q(product.tag)}, ${arr(product.sizes)}, '{}'::text[], true, true, ${product.id * 10});`,
    "insert into public.product_colours (product_id, name, hex, front_image, back_image, sort_order) values", colours(product) + ";");
}
out.push("", "select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));", "");
process.stdout.write(out.join("\n"));
