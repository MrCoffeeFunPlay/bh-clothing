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

const crossbody = {
  Black: asset("accessories/bh-crossbody.png"),
};

const animeArtBook = {
  Black: asset("anime/oni-art-book.png"),
};

const animeWallScroll = {
  Black: asset("anime/oni-wall-scroll.png"),
};

const fallenSwordLookbook = [asset("lookbook/fallen-sword-street.png"), asset("lookbook/fallen-sword-parking.png"), asset("lookbook/fallen-sword-black-model.png")];
const oniSwordLookbook = [asset("lookbook/oni-sword-street.png"), asset("lookbook/oni-sword-parking.png"), asset("lookbook/oni-sword-black-model.png"), asset("lookbook/oni-sword-white-model.png")];
const oniMaskLookbook = [asset("lookbook/oni-mask-street.png"), asset("lookbook/oni-mask-parking.png"), asset("lookbook/oni-mask-black-model.png")];
const roseLookbook = [asset("lookbook/rose-street.png"), asset("lookbook/rose-parking.png"), asset("lookbook/rose-black-model.png")];

const fallenSwordHoodie = { White: asset("hoodies/fallen-sword-white-new.png"), Black: asset("hoodies/fallen-sword-black-new.png"), Gray: asset("hoodies/fallen-sword-gray-new.png") };
const oniSwordHoodie = { Black: asset("hoodies/oni-sword-black-new.png"), Gray: asset("hoodies/oni-sword-gray-new.png"), White: asset("hoodies/oni-sword-white-new.png") };
const oniMaskHoodie = { Gray: asset("hoodies/oni-mask-gray-new.png"), Black: asset("hoodies/oni-mask-black-new.png"), White: asset("hoodies/oni-mask-white-new.png") };
const roseHoodie = { White: asset("hoodies/rose-white-new.png"), Black: asset("hoodies/rose-black-new.png"), Gray: asset("hoodies/rose-gray-new.png") };

const fallenSwordHoodieBack = { White: asset("hoodies/fallen-sword-white-back-printed.jpg"), Black: asset("hoodies/fallen-sword-black-back-printed.jpg"), Gray: asset("hoodies/fallen-sword-gray-back-printed.jpg") };
const oniSwordHoodieBack = { Black: asset("hoodies/oni-sword-black-back-printed.jpg"), Gray: asset("hoodies/oni-sword-gray-back-printed.jpg"), White: asset("hoodies/oni-sword-white-back-printed.jpg") };
const oniMaskHoodieBack = { Gray: asset("hoodies/oni-mask-gray-back-printed.jpg"), Black: asset("hoodies/oni-mask-black-back-printed.jpg"), White: asset("hoodies/oni-mask-white-back-printed.jpg") };
const roseHoodieBack = { White: asset("hoodies/rose-white-back-printed.jpg"), Black: asset("hoodies/rose-black-back-printed.jpg"), Gray: asset("hoodies/rose-gray-back-printed.jpg") };

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
const teeImages = (design: string, lookbookImages: string[]) => ({
  ...withProductImages(Object.fromEntries(teeColours.map(colour => [colour, asset(`tees/${design}/${colourSlug(colour)}-front.jpg`)])), lookbookImages, ["220g", "260g"],
    Object.fromEntries(teeColours.map(colour => [colour, asset(`tees/${design}/${colourSlug(colour)}-back.jpg`)]))),
  colorHexes: teeColourHexes,
  weightColors: teeColoursByWeight,
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
  { id: 1, name: "Fallen Sword", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Fallen Sword brings a striking blade, bold Japanese lettering and a red sun into one graphic statement. An oversized silhouette with room to move; choose 220 GSM for a lighter feel or 260 GSM for extra substance.", ...teeImages("fallen-sword", fallenSwordLookbook), ...teeOptions },
  { id: 2, name: "Oni Blade", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Crossed katana blades meet cherry blossom in Oni Blade — a balance of sharp lines and delicate detail. An oversized everyday silhouette, available in 220 GSM or the heavier 260 GSM.", ...teeImages("oni-blade", oniSwordLookbook), ...teeOptions },
  { id: 3, name: "Oni Mask", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "A fierce Oni mask, graphic framing and red accents give Oni Mask its unmistakable edge. Built around an oversized silhouette, with your choice of 220 GSM or a heavier 260 GSM feel.", ...teeImages("oni-mask", oniMaskLookbook), ...teeOptions },
  { id: 4, name: "Rose", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "A detailed rose and flowing lettering bring a quieter statement to Rose. An oversized silhouette that lets the artwork speak, available in 220 GSM or the more substantial 260 GSM.", ...teeImages("rose", roseLookbook), ...teeOptions },
  { id: 5, name: "Loose Shorts", category: "Shorts", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "BH loose shorts, available in multiple colours.", ...withProductImages(looseShorts, [], []) },
  { id: 6, name: "Fallen Sword Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Fallen Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(fallenSwordHoodie, [asset("lookbook/fallen-sword-hoodie-parking.png"), asset("lookbook/fallen-sword-hoodie-model.png")], [], fallenSwordHoodieBack) },
  { id: 7, name: "Oni Sword Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Oni Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(oniSwordHoodie, [asset("lookbook/oni-sword-street.png"), asset("lookbook/oni-sword-hoodie-parking.png"), asset("lookbook/oni-sword-hoodie-model.png")], [], oniSwordHoodieBack) },
  { id: 8, name: "Oni Mask Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Oni Mask artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(oniMaskHoodie, [asset("lookbook/oni-mask-hoodie-parking.png"), asset("lookbook/oni-mask-hoodie-model.png")], [], oniMaskHoodieBack) },
  { id: 9, name: "Rose Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Rose artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(roseHoodie, [asset("lookbook/rose-street.png"), asset("lookbook/rose-hoodie-parking.png"), asset("lookbook/rose-hoodie-model.png")], [], roseHoodieBack) },
  { id: 10, name: "BH Washed Cap", category: "Accessories", price: "Coming soon", rating: 0, reviews: 0, tag: "BH accessory", description: "A washed black six-panel cap for the everyday rotation.", ...withProductImages(accessories, [], []) },
  { id: 11, name: "BH Crossbody", category: "Accessories", price: "Coming soon", rating: 0, reviews: 0, tag: "BH accessory", description: "Compact black nylon crossbody for daily essentials.", ...withProductImages(crossbody, [], []) },
  { id: 12, name: "Oni Art Book", category: "Anime", price: "Coming soon", rating: 0, reviews: 0, tag: "BH background", description: "An original BH manga-inspired art-book placeholder for the future collection.", ...withProductImages(animeArtBook, [], []) },
  { id: 13, name: "Oni Wall Scroll", category: "Anime", price: "Coming soon", rating: 0, reviews: 0, tag: "BH background", description: "An original BH manga-inspired wall-scroll placeholder for the future collection.", ...withProductImages(animeWallScroll, [], []) },
];

export const categories = [
  ["Tees", "Original BH artwork, built for everyday.", asset("tees/fallen-sword/black-front.jpg")],
  ["Hoodies", "Pullover weight, drawstrings and kangaroo pockets.", oniSwordHoodie.Black],
  ["Shorts", "Relaxed fit, made to move.", looseShorts.Black],
  ["Accessories", "Caps, bags and finishing pieces.", accessories.Black],
  ["Anime", "Original manga-inspired BH background pieces.", animeWallScroll.Black],
] as const;
