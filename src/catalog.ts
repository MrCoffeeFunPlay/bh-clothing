import type { Sale } from "./pricing";
export type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  color: string;
  rating: number;
  reviews: number;
  image: string;
  tag?: string;
  description?: string;
  sizes?: string[];
  images?: string[];
  colorImages?: Record<string, string>;
  backImages?: Record<string, string>;
  colorHexes?: Record<string, string>;
  cottonWeights?: ("220g" | "260g")[];
  lookbookImages?: string[];
  sale?: Sale;
  prices?: { USD: number | null; ILS: number | null };
  gsmPrices?: Record<"220g" | "260g", { USD: number | null; ILS: number | null }>;
  gsmSalePrices?: Partial<Record<"220g" | "260g", { USD: number | null; ILS: number | null }>>;
  weightColors?: Partial<Record<"220g" | "260g", string[]>>;
  // A real product shown locked ("coming soon"): visible, but cannot be bought yet.
  comingSoon?: boolean;
  // Set when the product comes from the live Supabase catalogue.
  slug?: string;
  active?: boolean;
  selectedSize?: string;
  selectedWeight?: "220g" | "260g";
};

const asset = (path: string) => `/catalog/${path.split("/").map(encodeURIComponent).join("/")}`;

const colourHexes: Record<string, string> = {
  Black: "#171716", Blue: "#405c91", "Forest Green": "#294c39", Gray: "#8f9190", "Light Gray": "#d2d2cf",
  "Light Pink": "#efc6cf", Purple: "#6d4d86", Red: "#ae3034", White: "#faf9f5", Yellow: "#e4bf36",
  Khaki: "#9b8657", Mint: "#91c7b6", Pink: "#db8fa1",
};

const withProductImages = (colors: Record<string, string>, lookbookImages: string[] = [], cottonWeights: ("220g" | "260g")[] = ["220g", "260g"], backImages: Record<string, string> = {}) => ({
  color: Object.keys(colors).join(", "),
  image: Object.values(colors)[0],
  images: Object.values(colors),
  colorImages: colors,
  backImages,
  colorHexes: Object.fromEntries(Object.keys(colors).map((colour) => [colour, colourHexes[colour] || "#8d8275"])),
  sizes: ["S", "M", "L", "XL"],
  cottonWeights,
  lookbookImages,
});

const looseShorts = {
  Black: asset("Pants/loose shorts/black.png"),
  Blue: asset("Pants/loose shorts/blue0.png"),
  Gray: asset("Pants/loose shorts/gray.png"),
  Khaki: asset("Pants/loose shorts/khaki.png"),
  Mint: asset("Pants/loose shorts/mint.png"),
  Pink: asset("Pants/loose shorts/pink.png"),
  Red: asset("Pants/loose shorts/red.png"),
  White: asset("Pants/loose shorts/white.png"),
  Yellow: asset("Pants/loose shorts/yellow.png"),
};

const accessories = {
  Black: asset("accessories/bh-washed-cap.png"),
};

const animeArtBook = {
  Black: asset("anime/oni-art-book.png"),
};

const animeWallScroll = {
  Black: asset("anime/oni-wall-scroll.png"),
};


// Hoodies: digital mockups made like the tees (tools/tee-mockups/build_hoodies.py), on a concrete studio backdrop.
const hoodieColours = ["White", "Black", "Gray"];
const hoodieImages = (design: string) => withProductImages(
  Object.fromEntries(hoodieColours.map(colour => [colour, asset(`hoodies/${design}/${colour.toLowerCase()}-front.jpg`)])), [], [],
  Object.fromEntries(hoodieColours.map(colour => [colour, asset(`hoodies/${design}/${colour.toLowerCase()}-back.jpg`)])));

// Tee colours. To add a colour: give it a swatch here, list it under each fabric weight it is sold in,
// and add public/catalog/tees/<design>/<colour-slug>-front.jpg and -back.jpg for every design.
export const teeColourHexes: Record<string, string> = {
  White: "#f1efea", Black: "#1c1c1c", Navy: "#1f2940", "Dark Gray": "#4a4b4e", Beige: "#d8c7ab", "Light Blue": "#a8c4dc", Camel: "#b4865a",
};
export const teeColoursByWeight: Record<"220g" | "260g", string[]> = {
  "220g": ["White", "Black", "Navy", "Dark Gray", "Beige", "Light Blue", "Camel"],
  "260g": ["White", "Black", "Navy", "Dark Gray", "Beige"],
};
const teeColours = Object.keys(teeColourHexes).filter(colour => Object.values(teeColoursByWeight).some(list => list.includes(colour)));
const colourSlug = (colour: string) => colour.toLowerCase().replace(/\s+/g, "-");
// Tees show only their front and back images for now (no model photos).
const teeImages = (design: string) => ({
  ...withProductImages(Object.fromEntries(teeColours.map(colour => [colour, asset(`tees/${design}/${colourSlug(colour)}-front.jpg`)])), [], ["220g", "260g"],
    Object.fromEntries(teeColours.map(colour => [colour, asset(`tees/${design}/${colourSlug(colour)}-back.jpg`)]))),
  colorHexes: teeColourHexes,
  weightColors: teeColoursByWeight,
});

// A locked product: silhouette image (tools/tee-mockups/build_silhouettes.py), no price, cannot be bought yet.
const comingSoon = (silhouette: string) => ({
  price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "Coming soon to BH. This piece is locked for now.",
  ...withProductImages({ Black: asset(`coming-soon/${silhouette}.png`) }, [], []), sizes: [] as string[],
});

// Owner-confirmed tee prices, identical for all four designs. USD = ILS ÷ 3.1120, rounded up to .99
// (Bank of Israel representative rate for 23 Oct 2026, as shown on Mizrahi-Tefahot and Leumi rate pages, checked 26 Oct 2026).
export const teeUsdRate = 3.112;
const teeOptions = {
  sizes: ["S", "M", "L", "XL", "2XL"],
  gsmPrices: { "220g": { USD: 38.99, ILS: 120 }, "260g": { USD: 48.99, ILS: 150 } },
  gsmSalePrices: { "220g": { USD: 35.99, ILS: 109.99 }, "260g": { USD: 44.99, ILS: 139.99 } },
};

export const products: Product[] = [
  { id: 1, name: "Fallen Sword", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Fallen Sword brings a striking blade, bold Japanese lettering and a red sun into one graphic statement. An oversized silhouette with room to move; choose 220 GSM for a lighter feel or 260 GSM for extra substance.", ...teeImages("fallen-sword"), ...teeOptions },
  { id: 2, name: "Oni Blade", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Crossed katana blades meet cherry blossom in Oni Blade — a balance of sharp lines and delicate detail. An oversized everyday silhouette, available in 220 GSM or the heavier 260 GSM.", ...teeImages("oni-blade"), ...teeOptions },
  { id: 3, name: "Oni Mask", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "A fierce Oni mask, graphic framing and red accents give Oni Mask its unmistakable edge. Built around an oversized silhouette, with your choice of 220 GSM or a heavier 260 GSM feel.", ...teeImages("oni-mask"), ...teeOptions },
  { id: 4, name: "Rose", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "A detailed rose and flowing lettering bring a quieter statement to Rose. An oversized silhouette that lets the artwork speak, available in 220 GSM or the more substantial 260 GSM.", ...teeImages("rose"), ...teeOptions },
  { id: 5, name: "Loose Shorts", category: "Pants", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "BH loose shorts, available in multiple colours.", ...withProductImages(looseShorts, [], []) },
  { id: 6, name: "Fallen Sword Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "The Fallen Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...hoodieImages("fallen-sword") },
  { id: 7, name: "Oni Sword Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "The Oni Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...hoodieImages("oni-sword") },
  { id: 8, name: "Oni Mask Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "The Oni Mask artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...hoodieImages("oni-mask") },
  { id: 9, name: "Rose Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "The Rose artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...hoodieImages("rose") },
  { id: 12, name: "Oni Art Book", category: "Anime", price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "An original BH manga-inspired art-book placeholder for the future collection.", ...withProductImages(animeArtBook, [], []) },
  { id: 13, name: "Oni Wall Scroll", category: "Anime", price: "Coming soon", rating: 0, reviews: 0, tag: "Coming soon", comingSoon: true, description: "An original BH manga-inspired wall-scroll placeholder for the future collection.", ...withProductImages(animeWallScroll, [], []) },
  // Coming soon: real products shown locked with a silhouette until photos and prices are ready.
  { id: 14, name: "Straight Leg Pants", category: "Pants", ...comingSoon("pants-straight") },
  { id: 15, name: "Cargo Pants", category: "Pants", ...comingSoon("pants-cargo") },
  { id: 16, name: "Jogger Pants", category: "Pants", ...comingSoon("pants-jogger") },
  { id: 17, name: "Classic Shorts", category: "Pants", ...comingSoon("shorts") },
  { id: 18, name: "Gourmet Bracelet", category: "Accessories", ...comingSoon("bracelet") },
  { id: 19, name: "Gourmet Chain", category: "Accessories", ...comingSoon("chain") },
  { id: 20, name: "BH Cap", category: "Accessories", ...comingSoon("cap") },
  { id: 21, name: "Anime Hoodie", category: "Anime", ...comingSoon("hoodie") },
  { id: 22, name: "Anime Tee", category: "Anime", ...comingSoon("tee") },
  { id: 23, name: "Anime Pants", category: "Anime", ...comingSoon("pants-wide") },
];

export const categories = [
  ["Tees", "Original BH artwork, built for everyday.", asset("tees/fallen-sword/black-front.jpg")],
  ["Hoodies", "Pullover weight, drawstrings and kangaroo pockets.", asset("hoodies/oni-sword/black-front.jpg")],
  ["Pants", "Relaxed fit, made to move.", looseShorts.Black],
  ["Accessories", "Caps, bags and finishing pieces.", accessories.Black],
  ["Anime", "Original manga-inspired BH background pieces.", animeWallScroll.Black],
] as const;
