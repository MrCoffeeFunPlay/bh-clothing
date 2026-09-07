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

const fallenSword = {
  White: asset("t-shirts/FallenSword/White t-shirt/Front.png"),
  Black: asset("t-shirts/FallenSword/Black Tshirt/Front.png"),
  Blue: asset("t-shirts/FallenSword/Blue T-Shirt/Front-removebg-preview.png"),
  "Forest Green": asset("t-shirts/FallenSword/ForestGreen T-Shirt/Front-removebg-preview.png"),
  Gray: asset("t-shirts/FallenSword/Gray T-Shirt/Front-removebg-preview.png"),
  "Light Gray": asset("t-shirts/FallenSword/LightGray T-Shirt/Front-removebg-preview.png"),
  "Light Pink": asset("t-shirts/FallenSword/LightPink T-shirt/Front__1_-removebg-preview.png"),
  Purple: asset("t-shirts/FallenSword/Purple T-Shirt/Front-removebg-preview.png"),
  Red: asset("t-shirts/FallenSword/Red T-Shirt/Front__1_-removebg-preview.png"),
  Yellow: asset("t-shirts/FallenSword/Yellow T-Shirt/Front__2_-removebg-preview.png"),
};

const fallenSwordBack = {
  White: asset("t-shirts/FallenSword/White t-shirt/Back.png"), Black: asset("t-shirts/FallenSword/Black Tshirt/Back .png"), Blue: asset("t-shirts/FallenSword/Blue T-Shirt/Back-removebg-preview.png"), "Forest Green": asset("t-shirts/FallenSword/ForestGreen T-Shirt/Back-removebg-preview.png"), Gray: asset("t-shirts/FallenSword/Gray T-Shirt/Back-removebg-preview.png"), "Light Gray": asset("t-shirts/FallenSword/LightGray T-Shirt/Back-removebg-preview.png"), "Light Pink": asset("t-shirts/FallenSword/LightPink T-shirt/Back__1_-removebg-preview.png"), Purple: asset("t-shirts/FallenSword/Purple T-Shirt/Back-removebg-preview.png"), Red: asset("t-shirts/FallenSword/Red T-Shirt/Back__1_-removebg-preview.png"), Yellow: asset("t-shirts/FallenSword/Yellow T-Shirt/Back__2_-removebg-preview.png"),
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

const oniBladeBack = {
  Black: asset("t-shirts/Oni Blade T-Shirt/Black T-Shirt/Back-removebg-preview.png"), Blue: asset("t-shirts/Oni Blade T-Shirt/Blue T-Shirt/Back-removebg-preview.png"), "Forest Green": asset("t-shirts/Oni Blade T-Shirt/GreenForest T-Shirt/Back-removebg-preview.png"), Gray: asset("t-shirts/Oni Blade T-Shirt/Gray T-Shirt/Back-removebg-preview.png"), "Light Gray": asset("t-shirts/Oni Blade T-Shirt/LightGray T-Shirt/Back-removebg-preview.png"), "Light Pink": asset("t-shirts/Oni Blade T-Shirt/LightPink T-Shirt/Back-removebg-preview.png"), Purple: asset("t-shirts/Oni Blade T-Shirt/Purple T-Shirt/Back-removebg-preview.png"), Red: asset("t-shirts/Oni Blade T-Shirt/Red T-Shirt/Back-removebg-preview.png"), White: asset("t-shirts/Oni Blade T-Shirt/White T-Shirt/Back-removebg-preview.png"), Yellow: asset("t-shirts/Oni Blade T-Shirt/Yellow T-Shirt/Back-removebg-preview.png"),
};

const oniMask = {
  Red: asset("t-shirts/Oni Mask/Red T-Shirt/Front-removebg-preview.png"),
  Black: asset("t-shirts/Oni Mask/Black T-Shirt/Frontnobackground.png"),
  Blue: asset("t-shirts/Oni Mask/Blue T-Shirt/Front-removebg-preview.png"),
  "Forest Green": asset("t-shirts/Oni Mask/ForestGreen T-Shirt/Front-removebg-preview.png"),
  Gray: asset("t-shirts/Oni Mask/Gray T-Shirts/Front-removebg-preview.png"),
  "Light Gray": asset("t-shirts/Oni Mask/LightGray T-Shirt/Front-removebg-preview.png"),
  "Light Pink": asset("t-shirts/Oni Mask/LightPink T-Shirt/Front-removebg-preview.png"),
  Purple: asset("t-shirts/Oni Mask/Purple T-Shirt/Front-removebg-preview.png"),
  White: asset("t-shirts/Oni Mask/White T-Shirt/Front-removebg-preview.png"),
  Yellow: asset("t-shirts/Oni Mask/Yellow T-Shirt/Front-removebg-preview.png"),
};

const oniMaskBack = {
  Red: asset("t-shirts/Oni Mask/Red T-Shirt/Oni T-Shirt back.png"), Black: asset("t-shirts/Oni Mask/Black T-Shirt/Back no background.png"), Blue: asset("t-shirts/Oni Mask/Blue T-Shirt/Back__1_-removebg-preview.png"), "Forest Green": asset("t-shirts/Oni Mask/ForestGreen T-Shirt/Back-removebg-preview.png"), Gray: asset("t-shirts/Oni Mask/Gray T-Shirts/Back-removebg-preview.png"), "Light Gray": asset("t-shirts/Oni Mask/LightGray T-Shirt/Back-removebg-preview.png"), "Light Pink": asset("t-shirts/Oni Mask/LightPink T-Shirt/Back-removebg-preview.png"), Purple: asset("t-shirts/Oni Mask/Purple T-Shirt/Back-removebg-preview.png"), White: asset("t-shirts/Oni Mask/White T-Shirt/Back-removebg-preview.png"), Yellow: asset("t-shirts/Oni Mask/Yellow T-Shirt/Back-removebg-preview.png"),
};

const rose = {
  "Light Gray": asset("t-shirts/Rose/LightGtray T-Shirt/Front.png"),
  Black: asset("t-shirts/Rose/Black T-Shirt/Front.png"),
  Blue: asset("t-shirts/Rose/Blue T-Shirt/Front.png"),
  "Forest Green": asset("t-shirts/Rose/ForestGreen T-Shirt/Front.png"),
  Gray: asset("t-shirts/Rose/Gray T-Shirt/Front.png"),
  "Light Pink": asset("t-shirts/Rose/LightPink T-Shirt/Front.png"),
  Purple: asset("t-shirts/Rose/Purple T-Shirt/Front.png"),
  Red: asset("t-shirts/Rose/Red T-Shirt/Front.png"),
  White: asset("t-shirts/Rose/White T-Shirt/Front (2).png"),
  Yellow: asset("t-shirts/Rose/Yellow T-Shirt/Front.png"),
};

const roseBack = {
  "Light Gray": asset("t-shirts/Rose/LightGtray T-Shirt/Back.png"), Black: asset("t-shirts/Rose/Black T-Shirt/Back.png"), Blue: asset("t-shirts/Rose/Blue T-Shirt/Back.png"), "Forest Green": asset("t-shirts/Rose/ForestGreen T-Shirt/Back.png"), Gray: asset("t-shirts/Rose/Gray T-Shirt/Back.png"), "Light Pink": asset("t-shirts/Rose/LightPink T-Shirt/Back.png"), Purple: asset("t-shirts/Rose/Purple T-Shirt/Back.png"), Red: asset("t-shirts/Rose/Red T-Shirt/Back.png"), White: asset("t-shirts/Rose/White T-Shirt/Back (1).png"), Yellow: asset("t-shirts/Rose/Yellow T-Shirt/Back.png"),
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

const fallenSwordLookbook = [asset("lookbook/fallen-sword-street.png"), asset("lookbook/fallen-sword-parking.png"), asset("lookbook/fallen-sword-black-model.png"), asset("lookbook/fallen-sword-white-model.png"), asset("lookbook/fallen-sword-purple-model.png")];
const oniSwordLookbook = [asset("lookbook/oni-sword-street.png"), asset("lookbook/oni-sword-parking.png"), asset("lookbook/oni-sword-black-model.png"), asset("lookbook/oni-sword-white-model.png"), asset("lookbook/oni-sword-purple-model.png")];
const oniMaskLookbook = [asset("lookbook/oni-mask-street.png"), asset("lookbook/oni-mask-parking.png"), asset("lookbook/oni-mask-black-model.png"), asset("lookbook/oni-mask-white-model.png"), asset("lookbook/oni-mask-purple-model.png")];
const roseLookbook = [asset("lookbook/rose-street.png"), asset("lookbook/rose-parking.png"), asset("lookbook/rose-black-model.png"), asset("lookbook/rose-white-model.png"), asset("lookbook/rose-purple-model.png")];

const fallenSwordHoodie = { White: asset("hoodies/fallen-sword-white-new.png"), Black: asset("hoodies/fallen-sword-black-new.png"), Gray: asset("hoodies/fallen-sword-gray-new.png") };
const oniSwordHoodie = { Black: asset("hoodies/oni-sword-black-new.png"), Gray: asset("hoodies/oni-sword-gray-new.png"), White: asset("hoodies/oni-sword-white-new.png") };
const oniMaskHoodie = { Gray: asset("hoodies/oni-mask-gray-new.png"), Black: asset("hoodies/oni-mask-black-new.png"), White: asset("hoodies/oni-mask-white-new.png") };
const roseHoodie = { White: asset("hoodies/rose-white-new.png"), Black: asset("hoodies/rose-black-new.png"), Gray: asset("hoodies/rose-gray-new.png") };

const fallenSwordHoodieBack = { White: asset("hoodies/fallen-sword-white-back-printed.jpg"), Black: asset("hoodies/fallen-sword-black-back-printed.jpg"), Gray: asset("hoodies/fallen-sword-gray-back-printed.jpg") };
const oniSwordHoodieBack = { Black: asset("hoodies/oni-sword-black-back-printed.jpg"), Gray: asset("hoodies/oni-sword-gray-back-printed.jpg"), White: asset("hoodies/oni-sword-white-back-printed.jpg") };
const oniMaskHoodieBack = { Gray: asset("hoodies/oni-mask-gray-back-printed.jpg"), Black: asset("hoodies/oni-mask-black-back-printed.jpg"), White: asset("hoodies/oni-mask-white-back-printed.jpg") };
const roseHoodieBack = { White: asset("hoodies/rose-white-back-printed.jpg"), Black: asset("hoodies/rose-black-back-printed.jpg"), Gray: asset("hoodies/rose-gray-back-printed.jpg") };

// Prices and stock deliberately stay unpublished until the owner provides them.
export const products: Product[] = [
  { id: 1, name: "Fallen Sword", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Fallen Sword artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(fallenSword, fallenSwordLookbook, undefined, fallenSwordBack) },
  { id: 2, name: "Oni Sword", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Oni Sword artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(oniBlade, oniSwordLookbook, undefined, oniBladeBack) },
  { id: 3, name: "Oni Mask", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Oni Mask artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(oniMask, oniMaskLookbook, undefined, oniMaskBack) },
  { id: 4, name: "Rose", category: "Tees", price: "Coming soon", rating: 0, reviews: 0, tag: "BH original", description: "Original BH Rose artwork. Choose the colour and cotton weight that feel right for you.", ...withProductImages(rose, roseLookbook, undefined, roseBack) },
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
  ["Tees", "Original BH artwork, built for everyday.", fallenSword.Black],
  ["Hoodies", "Pullover weight, drawstrings and kangaroo pockets.", oniSwordHoodie.Black],
  ["Shorts", "Relaxed fit, made to move.", looseShorts.Black],
  ["Accessories", "Caps, bags and finishing pieces.", accessories.Black],
  ["Anime", "Original manga-inspired BH background pieces.", animeWallScroll.Black],
] as const;
