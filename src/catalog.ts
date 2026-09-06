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
  colorHexes?: Record<string, string>;
  cottonWeights?: ("220g" | "260g")[];
  lookbookImages?: string[];
};

const asset = (path: string) => `/catalog/${path.split("/").map(encodeURIComponent).join("/")}`;

const colourHexes: Record<string, string> = {
  Black: "#171716", Blue: "#405c91", "Forest Green": "#294c39", Gray: "#8f9190", "Light Gray": "#d2d2cf",
  "Light Pink": "#efc6cf", Purple: "#6d4d86", Red: "#ae3034", White: "#faf9f5", Yellow: "#e4bf36",
  Khaki: "#9b8657", Mint: "#91c7b6", Pink: "#db8fa1",
};

const withProductImages = (colors: Record<string, string>, lookbookImages: string[] = [], cottonWeights: ("220g" | "260g")[] = ["220g", "260g"]) => ({
  color: Object.keys(colors).join(", "),
  image: Object.values(colors)[0],
  images: Object.values(colors),
  colorImages: colors,
  colorHexes: Object.fromEntries(Object.keys(colors).map((colour) => [colour, colourHexes[colour] || "#8d8275"])),
  sizes: ["S", "M", "L", "XL"],
  cottonWeights,
  lookbookImages,
});

const fallenSword = {
  Black: asset("t-shirts/FallenSword/Black Tshirt/Front.png"),
  Blue: asset("t-shirts/FallenSword/Blue T-Shirt/Front-removebg-preview.png"),
  "Forest Green": asset("t-shirts/FallenSword/ForestGreen T-Shirt/Front-removebg-preview.png"),
  Gray: asset("t-shirts/FallenSword/Gray T-Shirt/Front-removebg-preview.png"),
  "Light Gray": asset("t-shirts/FallenSword/LightGray T-Shirt/Front-removebg-preview.png"),
  "Light Pink": asset("t-shirts/FallenSword/LightPink T-shirt/Front__1_-removebg-preview.png"),
  Purple: asset("t-shirts/FallenSword/Purple T-Shirt/Front-removebg-preview.png"),
  Red: asset("t-shirts/FallenSword/Red T-Shirt/Front__1_-removebg-preview.png"),
  White: asset("t-shirts/FallenSword/White t-shirt/Front.png"),
  Yellow: asset("t-shirts/FallenSword/Yellow T-Shirt/Front__2_-removebg-preview.png"),
};

const oniBlade = {
  Black: asset("t-shirts/Oni Blade T-Shirt/Black T-Shirt/Front-removebg-preview.png"),
  Blue: asset("t-shirts/Oni Blade T-Shirt/Blue T-Shirt/Front-removebg-preview.png"),
  "Forest Green": asset("t-shirts/Oni Blade T-Shirt/GreenForest T-Shirt/Front-removebg-preview.png"),
  Gray: asset("t-shirts/Oni Blade T-Shirt/Gray T-Shirt/Front-removebg-preview.png"),
  "Light Gray": asset("t-shirts/Oni Blade T-Shirt/LightGray T-Shirt/Front-removebg-preview.png"),
  "Light Pink": asset("t-shirts/Oni Blade T-Shirt/LightPink T-Shirt/Front-removebg-preview.png"),
  Purple: asset("t-shirts/Oni Blade T-Shirt/Purple T-Shirt/Front-removebg-preview.png"),
  Red: asset("t-shirts/Oni Blade T-Shirt/Red T-Shirt/Front-removebg-preview.png"),
  White: asset("t-shirts/Oni Blade T-Shirt/White T-Shirt/Front-removebg-preview.png"),
  Yellow: asset("t-shirts/Oni Blade T-Shirt/Yellow T-Shirt/Front-removebg-preview.png"),
};

const oniMask = {
  Black: asset("t-shirts/Oni Mask/Black T-Shirt/Frontnobackground.png"),
  Blue: asset("t-shirts/Oni Mask/Blue T-Shirt/Front-removebg-preview.png"),
  "Forest Green": asset("t-shirts/Oni Mask/ForestGreen T-Shirt/Front-removebg-preview.png"),
  Gray: asset("t-shirts/Oni Mask/Gray T-Shirts/Front-removebg-preview.png"),
  "Light Gray": asset("t-shirts/Oni Mask/LightGray T-Shirt/Front-removebg-preview.png"),
  "Light Pink": asset("t-shirts/Oni Mask/LightPink T-Shirt/Front-removebg-preview.png"),
  Purple: asset("t-shirts/Oni Mask/Purple T-Shirt/Front-removebg-preview.png"),
  Red: asset("t-shirts/Oni Mask/Red T-Shirt/Front-removebg-preview.png"),
  White: asset("t-shirts/Oni Mask/White T-Shirt/Front-removebg-preview.png"),
  Yellow: asset("t-shirts/Oni Mask/Yellow T-Shirt/Front-removebg-preview.png"),
};

const rose = {
  Black: asset("t-shirts/Rose/Black T-Shirt/Front.png"),
  Blue: asset("t-shirts/Rose/Blue T-Shirt/Front.png"),
  "Forest Green": asset("t-shirts/Rose/ForestGreen T-Shirt/Front.png"),
  Gray: asset("t-shirts/Rose/Gray T-Shirt/Front.png"),
  "Light Gray": asset("t-shirts/Rose/LightGtray T-Shirt/Front.png"),
  "Light Pink": asset("t-shirts/Rose/LightPink T-Shirt/Front.png"),
  Purple: asset("t-shirts/Rose/Purple T-Shirt/Front.png"),
  Red: asset("t-shirts/Rose/Red T-Shirt/Front.png"),
  White: asset("t-shirts/Rose/White T-Shirt/Front (2).png"),
  Yellow: asset("t-shirts/Rose/Yellow T-Shirt/Front.png"),
};

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

const fallenSwordLookbook = asset("lookbook/fallen-sword-models.png");
const oniSwordLookbook = asset("lookbook/oni-sword-models.png");
const oniMaskLookbook = asset("lookbook/oni-mask-models.png");
const roseLookbook = asset("lookbook/rose-models.png");

const fallenSwordHoodie = { Black: asset("hoodies/fallen-sword-colours.png"), Gray: asset("hoodies/fallen-sword-colours.png"), White: asset("hoodies/fallen-sword-colours.png") };
const oniSwordHoodie = { Black: asset("hoodies/oni-sword-black.png"), Gray: asset("hoodies/oni-sword-colours.png"), White: asset("hoodies/oni-sword-colours.png") };
const oniMaskHoodie = { Black: asset("hoodies/oni-mask-colours.png"), Gray: asset("hoodies/oni-mask-colours.png"), White: asset("hoodies/oni-mask-colours.png") };
const roseHoodie = { Black: asset("hoodies/rose-colours.png"), Gray: asset("hoodies/rose-colours.png"), White: asset("hoodies/rose-colours.png") };

// Prices and stock deliberately stay unpublished until the owner provides them.
export const products: Product[] = [
  { id: 1, name: "Fallen Sword", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Fallen Sword artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(fallenSword, [fallenSwordLookbook]) },
  { id: 2, name: "Oni Sword", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Oni Sword artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(oniBlade, [oniSwordLookbook]) },
  { id: 3, name: "Oni Mask", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Oni Mask artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(oniMask, [oniMaskLookbook]) },
  { id: 4, name: "Rose", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Rose artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(rose, [roseLookbook]) },
  { id: 5, name: "Loose Shorts", category: "Shorts", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "BH loose shorts, available in multiple colours.", ...withProductImages(looseShorts, [], []) },
  { id: 6, name: "Fallen Sword Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Fallen Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(fallenSwordHoodie, [asset("lookbook/fallen-sword-hoodie-model.png")]) },
  { id: 7, name: "Oni Sword Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Oni Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(oniSwordHoodie, [asset("lookbook/oni-sword-hoodie-model.png")]) },
  { id: 8, name: "Oni Mask Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Oni Mask artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(oniMaskHoodie, [asset("lookbook/oni-mask-hoodie-model.png")]) },
  { id: 9, name: "Rose Hoodie", category: "Hoodies", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "The Rose artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.", ...withProductImages(roseHoodie, [asset("lookbook/rose-hoodie-model.png")]) },
];

export const categories = [
  ["Tees", "Original BH artwork, built for everyday.", fallenSword.Black],
  ["Hoodies", "Pullover weight, drawstrings and kangaroo pockets.", oniSwordHoodie.Black],
  ["Shorts", "Relaxed fit, made to move.", looseShorts.Black],
] as const;
