import { FormEvent, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Heart, Instagram, Mail, Menu, MessageCircle, PackageCheck, Search, ShoppingBag, Sparkles, Star, UserRound, WalletCards, X, ZoomIn } from "lucide-react";

type View = "home" | "store" | "anime" | "club" | "account" | "reviews" | "product";
type Product = { id: number; name: string; category: string; price: string; color: string; rating: number; reviews: number; image: string; tag?: string };

const contactEmail = "hello@bhclothing.com";
const products: Product[] = [
  { id: 1, name: "BH Heavyweight Tee", category: "Tees", price: "$48.00", color: "Washed Black", rating: 4.9, reviews: 42, tag: "New", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=90" },
  { id: 2, name: "After Hours Hoodie", category: "Hoodies", price: "$112.00", color: "Stone", rating: 4.8, reviews: 31, tag: "Limited", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=90" },
  { id: 3, name: "Relaxed Cargo Pant", category: "Bottoms", price: "$96.00", color: "Graphite", rating: 4.7, reviews: 18, image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=90" },
  { id: 4, name: "Mono Logo Cap", category: "Accessories", price: "$38.00", color: "Ink", rating: 4.6, reviews: 12, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=90" },
  { id: 5, name: "Beyond Frame Tee", category: "Anime", price: "$62.00", color: "Ecru", rating: 4.9, reviews: 54, tag: "Anime edit", image: "https://images.unsplash.com/photo-1614583225154-5fc3b0fd1cdd?auto=format&fit=crop&w=900&q=90" },
  { id: 6, name: "Core Long Sleeve", category: "Tees", price: "$62.00", color: "White", rating: 4.5, reviews: 8, image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=90" },
];
const categories = [
  ["Tees", "Everyday weight. Better shape.", "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1100&q=85"],
  ["Hoodies", "Soft structure for later hours.", "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1100&q=85"],
  ["Bottoms", "Made to move, cut to stay.", "https://images.unsplash.com/photo-1506629905607-d9b1f7b7a5b8?auto=format&fit=crop&w=1100&q=85"],
  ["Anime", "A separate world inside BH.", "https://images.unsplash.com/photo-1614583225154-5fc3b0fd1cdd?auto=format&fit=crop&w=1100&q=85"],
  ["Accessories", "The final detail.", "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=1100&q=85"],
];

function Stars({ value }: { value: number }) {
  return <span className="stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < Math.round(value) ? "currentColor" : "none"} />)}</span>;
}

function Card({ product, open, add }: { product: Product; open: (product: Product) => void; add: () => void }) {
  return <article className="card">
    <button className="card-image" onClick={() => open(product)}><img src={product.image} alt={product.name}/>{product.tag && <span>{product.tag}</span>}<i><ZoomIn size={16}/> View piece</i></button>
    <div><p>{product.category}</p><button onClick={() => open(product)}>{product.name}</button><strong>{product.price}</strong></div>
    <button className="add" onClick={add}>Add +</button>
  </article>;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState(0);
  const [product, setProduct] = useState(products[0]);
  const [clubTab, setClubTab] = useState<"points" | "plans">("points");
  const [chat, setChat] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const go = (next: View) => { setView(next); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const open = (next: Product) => { setProduct(next); go("product"); };
  const add = () => setCart((count) => count + 1);
  const listed = products.filter((item) => (category === "All" || item.category === category) && (item.name + " " + item.category).toLowerCase().includes(query.toLowerCase()));
  return <div className="app">
    <div className="announcement">Free international shipping over $100 <span>•</span> Earn BH Points on every purchase</div>
    <header><button className="icon menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button><button className="wordmark" onClick={() => go("home")}>BH <span>Clothing</span></button>
      <nav className={menu ? "open" : ""}>{[["Home","home"],["Store","store"],["New Drop","store"],["Anime","anime"],["BH Club","club"]].map(([label, target]) => <button key={label} className={view === target ? "active" : ""} onClick={() => go(target as View)}>{label}</button>)}</nav>
      <div className="actions"><button className="icon" onClick={() => setSearch(!search)}>{search ? <X/> : <Search/>}</button><button className="icon" onClick={() => go("account")}><UserRound/></button><button className="bag" onClick={() => go("account")}><ShoppingBag/><span>{String(cart).padStart(2, "0")}</span></button></div>
    </header>
    {search && <div className="searchbar"><Search size={18}/><input autoFocus placeholder="Search BH Clothing" value={query} onChange={(event) => setQuery(event.target.value)}/><span>{listed.length} pieces</span></div>}
    <main>
      {view === "home" && <Home go={go} open={open} add={add}/>}
      {view === "store" && <Store listed={listed} category={category} setCategory={setCategory} open={open}/>}
      {view === "anime" && <Anime open={open}/>}
      {view === "club" && <Club tab={clubTab} setTab={setClubTab} go={go}/>}
      {view === "account" && <Account go={go}/>}
      {view === "reviews" && <Reviews open={open}/>}
      {view === "product" && <ProductPage product={product} go={go} add={add}/>}
    </main>
    <section className="newsletter"><div><p className="kicker">Stay connected</p><h2>Keep your <em>story</em> moving.</h2></div><div><p>New drops, member-only news and no noise.</p>{subscribed ? <p className="success"><Check size={16}/> You’re on the list.</p> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); setSubscribed(true); }}><input type="email" required placeholder="Your email address"/><button>Join <ArrowRight size={15}/></button></form>}</div></section>
    <footer><div className="footer-top"><button className="wordmark" onClick={() => go("home")}>BH <span>Clothing</span></button><p>Wear your story. Your way.</p><div><a href={"mailto:" + contactEmail}><Mail size={15}/> Email</a><a href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a><a href="https://instagram.com/" target="_blank" rel="noreferrer"><Instagram size={15}/> Instagram</a></div></div><div className="footer-bottom"><span>© 2026 BH Clothing</span><button onClick={() => go("reviews")}>Reviews</button><button onClick={() => go("club")}>BH Club</button><span>Privacy · Terms</span></div></footer>
    <button className="chat-trigger" onClick={() => setChat(!chat)}>{chat ? <X/> : <MessageCircle/>}</button>
    {chat && <aside className="chat"><div><b><Sparkles size={15}/> BH Assistant</b><button onClick={() => setChat(false)}><X size={16}/></button></div><p>Need help with size, orders or BH Club?</p><button>Help me find my size <ArrowRight size={15}/></button><button>Tell me about BH Points <ArrowRight size={15}/></button><a href="https://wa.me/" target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowRight size={15}/></a><a href={"mailto:" + contactEmail}>Email BH Support <Mail size={15}/></a></aside>}
  </div>;
}

function Home({ go, open, add }: { go: (view: View) => void; open: (product: Product) => void; add: () => void }) {
  return <><section className="hero"><div><p className="kicker">BH / New season</p><h1>OWN YOUR<br/><em>LAYER</em><span>.</span></h1><p>Premium streetwear for the days that deserve more than basic.</p><button className="primary" onClick={() => go("store")}>Shop new drop <ArrowRight size={16}/></button></div><div className="hero-image"><img src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1600&q=90" alt="Person in a black streetwear hoodie"/><span>Heavyweight. Everyday.</span><b>BH<small>EST. 2024</small></b></div></section>
  <section className="section"><div className="head"><div><p className="kicker">Just landed</p><h2>New <em>drop</em><span>.</span></h2></div><button className="inline" onClick={() => go("store")}>View all pieces <ArrowRight size={16}/></button></div><div className="product-row">{products.slice(0,4).map((item) => <Card key={item.id} product={item} open={open} add={add}/>)}</div></section>
  <section className="store-promo"><div><p className="kicker">Find your fit</p><h2>The store is<br/>your <em>playlist</em><span>.</span></h2><p>Enter by mood, category, or whatever version of you showed up today.</p><button className="primary light" onClick={() => go("store")}>Explore the store <ArrowRight size={16}/></button></div><button onClick={() => go("store")}><img src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=90" alt="T-shirts on a rack"/><span>Tees · Hoodies · Bottoms · Anime · Accessories</span></button></section>
  <section className="club-preview"><div><p className="kicker">BH Club</p><h2>Built to <em>give back</em><span>.</span></h2><p>Earn BH Points towards future purchases. Join a BH Plan when you want member pricing, early access, and more.</p><div><button onClick={() => go("club")}>Explore BH Points <ArrowRight size={16}/></button><button onClick={() => go("club")}>Explore BH Plans <ArrowRight size={16}/></button></div></div><div className="wallet-preview"><WalletCards size={27}/><p>BH Points wallet</p><strong>1,240 <small>points</small></strong><span>$62.00 in future credit</span></div></section></>;
}

function Store({ listed, category, setCategory, open }: { listed: Product[]; category: string; setCategory: (category: string) => void; open: (product: Product) => void }) {
  return <section className="page"><div className="intro"><p className="kicker">BH Store</p><h1>Pick your<br/><em>lane</em><span>.</span></h1><p>Every category has its own point of view. Start anywhere.</p></div><div className="category-wall">{categories.map(([name, detail, image]) => <button key={name} className={category === name ? "selected" : ""} onClick={() => setCategory(name)}><img src={image} alt=""/><span><small>{detail}</small><strong>{name}<ArrowRight size={17}/></strong></span></button>)}</div><div className="section store-list"><div className="head"><h2>{category === "All" ? "All pieces" : category}<span>.</span></h2><button className="inline" onClick={() => setCategory("All")}>Show all</button></div><div className="product-grid">{listed.map((item) => <Card key={item.id} product={item} open={open} add={() => {}}/>)}</div></div></section>;
}

function Anime({ open }: { open: (product: Product) => void }) {
  return <section className="page anime"><div className="intro"><p className="kicker">BH Anime</p><h1>A world<br/><em>apart</em><span>.</span></h1><p>Anime pieces are a dedicated edit inside BH—not a costume, a point of view.</p></div><div className="anime-banner"><img src="https://images.unsplash.com/photo-1614583225154-5fc3b0fd1cdd?auto=format&fit=crop&w=1800&q=90" alt="BH anime collection"/><span>BH Anime / Chapter 01</span></div><div className="section product-grid">{[products[4], products[0], products[1]].map((item) => <Card key={item.id} product={item} open={open} add={() => {}}/>)}</div></section>;
}

function Club({ tab, setTab, go }: { tab: "points" | "plans"; setTab: (tab: "points" | "plans") => void; go: (view: View) => void }) {
  return <section className="page club-page"><div className="intro"><p className="kicker">BH Club</p><h1>More ways<br/>to be <em>BH</em><span>.</span></h1><p>BH Points and BH Plans work together, but they are not the same thing.</p></div><div className="tabs"><button className={tab === "points" ? "active" : ""} onClick={() => setTab("points")}>BH Points</button><button className={tab === "plans" ? "active" : ""} onClick={() => setTab("plans")}>BH Plans</button></div>{tab === "points" ? <div className="points"><div><p className="kicker">Your future credit</p><h2>Shop. Earn.<br/><em>Use it later</em><span>.</span></h2><p>Every purchase earns BH Points. Redeem them against a future cart or choose a BH Gift Card.</p><button className="primary" onClick={() => go("account")}>View my wallet <ArrowRight size={16}/></button></div><div className="points-card"><WalletCards size={32}/><span>BH Points balance</span><strong>1,240</strong><p>Available for your next purchase</p><div><b>1,000 points</b><small>= $50 credit or a $50 Gift Card</small></div></div></div> : <div className="plans">{[["BH CORE","Member pricing on selected drops"],["BH PLUS","Early access and stronger member benefits"],["BH BLACK","The full BH Club experience"]].map(([name, feature], index) => <article key={name} className={index === 1 ? "featured" : ""}><p>{name}</p><h2>{name.split(" ")[1]}<span>.</span></h2><strong>Monthly membership</strong><ul><li>{feature}</li><li>Plan-only offers and benefits</li><li>Account prefix: {name}</li></ul><button className="primary" onClick={() => go("account")}>Explore plan <ArrowRight size={16}/></button></article>)}</div>}</section>;
}

function Account({ go }: { go: (view: View) => void }) {
  const cards = [[WalletCards,"BH Points wallet","1,240","≈ $62.00 available credit","Use points"],[Sparkles,"My BH Plan","BH CORE","Member benefits are active","View plan"],[PackageCheck,"Orders","02","One order is on its way","Track order"],[Heart,"Wishlist","06","Saved pieces waiting for you","View wishlist"]] as const;
  return <section className="page account"><div className="account-hero"><div><p className="kicker">Your account</p><h1>BH CORE<br/><em>Member</em><span>.</span></h1><p>One place for your plan, wallet, orders and saved pieces.</p></div><b>BH</b></div><div className="account-grid">{cards.map(([Icon, title, value, detail, action]) => <article key={title}><Icon/><p>{title}</p><strong>{value}</strong><small>{detail}</small><button onClick={() => go(title === "Wishlist" ? "store" : "club")}>{action}<ArrowRight size={15}/></button></article>)}</div></section>;
}

function Reviews({ open }: { open: (product: Product) => void }) {
  const [filter, setFilter] = useState("All");
  const items = [[5,"Heavyweight but still comfortable","The cut is perfect and the material feels expensive.",products[0]],[5,"The hoodie I keep reaching for","Exactly the oversized fit I wanted.",products[1]],[3,"Great piece, check the fit","Quality is there; I would prefer a slightly longer length.",products[2]],[4,"Anime without looking costume-y","The detail is subtle and really clean in person.",products[4]]] as const;
  return <section className="page reviews"><div className="intro"><p className="kicker">The BH review room</p><h1>Real <em>opinions</em><span>.</span></h1><p>Read every kind of feedback, then decide for yourself.</p></div><div className="review-summary"><div><strong>4.8</strong><Stars value={5}/><span>From 147 verified reviews</span></div><div>{[5,4,3,2,1].map((value) => <p key={value}><span>{value} star</span><i><b style={{width: (value === 5 ? 76 : value === 4 ? 16 : value === 3 ? 6 : 2) + "%"}}/></i></p>)}</div></div><div className="filters">{["All","Positive","Critical"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="review-list">{items.filter(([score]) => filter === "All" || filter === "Positive" ? score >= 4 : score <= 3).map(([score, title, text, item]) => <article key={title}><div><Stars value={score}/><small>{score}/5</small></div><h3>{title}</h3><p>{text}</p><button onClick={() => open(item)}>View {item.name}<ArrowRight size={15}/></button></article>)}</div></section>;
}

function ProductPage({ product, add, go }: { product: Product; add: () => void; go: (view: View) => void }) {
  const [size, setSize] = useState("M"); const [color, setColor] = useState(product.color); const [zoom, setZoom] = useState(false);
  return <section className="product-page"><button className="back" onClick={() => go("store")}><ChevronLeft size={17}/> Back to store</button><div className="product-layout"><div className="gallery"><button className="main-image" onClick={() => setZoom(true)}><img src={product.image} alt={product.name}/><span><ZoomIn size={17}/> Click to zoom</span></button><div className="thumbs">{[product.image, products[(product.id + 1) % products.length].image, products[(product.id + 2) % products.length].image].map((src) => <img key={src} src={src} alt=""/>)}</div></div><div className="product-info"><p className="kicker">BH / {product.category}</p><h1>{product.name}<span>.</span></h1><div className="rating"><Stars value={product.rating}/><button>{product.rating} · {product.reviews} reviews</button></div><strong className="price">{product.price}</strong><p>A premium BH essential built with a considered fit, substantial weight and an easy everyday feel.</p><div className="option"><span>Colour <b>{color}</b></span><div className="swatches">{[product.color,"Black","Ecru"].map((item) => <button key={item} className={color === item ? "active" : ""} onClick={() => setColor(item)}><i className={item === "Black" ? "black" : item === "Ecru" ? "ecru" : "stone"}/></button>)}</div></div><div className="option"><span>Size <button>Size guide</button></span><div className="sizes">{["XS","S","M","L","XL"].map((item) => <button key={item} className={size === item ? "active" : ""} onClick={() => setSize(item)}>{item}</button>)}</div></div><button className="add-bag" onClick={add}>Add to bag <span>{product.price}</span></button><div className="benefits"><p><PackageCheck size={17}/> International shipping available</p><p><Heart size={17}/> Easy returns within 30 days</p></div></div></div>{zoom && <div className="zoom" onClick={() => setZoom(false)}><button><X/></button><img src={product.image} alt={product.name + " enlarged"}/></div>}</section>;
}
