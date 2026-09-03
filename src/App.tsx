import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, AtSign, BadgeDollarSign, CalendarDays, Check, ChevronLeft, ChevronDown, Coins, CreditCard, Heart, Mail, Menu, MessageCircle, PackageCheck, Search, ShoppingBag, Sparkles, Star, UserRound, WalletCards, X, ZoomIn } from "lucide-react";

type View = "home" | "store" | "club" | "account" | "reviews" | "product" | "cart" | "admin";
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

function Card({ product, open, add }: { product: Product; open: (product: Product) => void; add: (product: Product) => void }) {
  return <article className="card">
    <button className="card-image" onClick={() => open(product)}><img src={product.image} alt={product.name}/>{product.tag && <span>{product.tag}</span>}<i><ZoomIn size={16}/> View piece</i></button>
    <div><p>{product.category}</p><button onClick={() => open(product)}>{product.name}</button><strong>{product.price}</strong></div>
    <button className="add" onClick={() => add(product)}>Add +</button>
  </article>;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Product[]>([]);
  const [product, setProduct] = useState(products[0]);
  const [clubTab, setClubTab] = useState<"points" | "plans">("points");
  const [chat, setChat] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => {
    const finish = () => window.setTimeout(() => setLoading(false), 650);
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => window.removeEventListener("load", finish);
  }, []);
  const go = (next: View) => { setView(next); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const open = (next: Product) => { setProduct(next); go("product"); };
  const add = (next: Product) => { setCart((items) => [...items, next]); setCartOpen(true); };
  const remove = (id: number) => setCart((items) => items.filter((item) => item.id !== id));
  const listed = products.filter((item) => (category === "All" || item.category === category) && (item.name + " " + item.category).toLowerCase().includes(query.toLowerCase()));
  if (loading) return <div className="bh-loader"><span className="bh-loader-mark">BH</span></div>;
  return <div className="app">
    <div className="announcement">Free international shipping over $100 <span>•</span> Earn BH Points on every purchase</div>
    <header><button className="icon menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button><button className="wordmark" onClick={() => go("home")}>BH <span>Clothing</span></button>
      <nav className={menu ? "open" : ""}>
        <button className={view === "home" ? "active" : ""} onClick={() => go("home")}>Home</button>
        <div className="nav-menu"><button className={view === "store" ? "active" : ""} onClick={() => go("store")}>Store <ChevronDown size={13}/></button><div className="nav-dropdown">{["All", "Tees", "Hoodies", "Bottoms", "Anime", "Accessories"].map((item) => <button key={item} onClick={() => { setCategory(item); go("store"); }}>{item === "All" ? "Shop all" : item}</button>)}</div></div>
        <button onClick={() => { setCategory("All"); go("store"); }}>New Drop</button>
        <div className="nav-menu"><button className={view === "club" ? "active" : ""} onClick={() => go("club")}>BH Club <ChevronDown size={13}/></button><div className="nav-dropdown"><button onClick={() => { setClubTab("plans"); go("club"); }}>BH Plans</button><button onClick={() => { setClubTab("points"); go("club"); }}>BH Points</button></div></div>
      </nav>
      <div className="actions"><button className="icon" onClick={() => setSearch(!search)}>{search ? <X/> : <Search/>}</button><button className="icon" onClick={() => signedIn ? go("account") : setAuthOpen(true)}><UserRound/></button><button className="bag" onClick={() => setCartOpen(true)}><ShoppingBag/><span>{String(cart.length).padStart(2, "0")}</span></button></div>
    </header>
    {search && <div className="searchbar"><Search size={18}/><input autoFocus placeholder="Search BH Clothing" value={query} onChange={(event) => setQuery(event.target.value)}/><span>{listed.length} pieces</span></div>}
    <main>
      {view === "home" && <Home go={go} open={open} add={add}/>}
      {view === "store" && <Store listed={listed} category={category} setCategory={setCategory} open={open} add={add}/>}
      {view === "club" && <Club tab={clubTab} setTab={setClubTab} go={go}/>}
      {view === "account" && <Account go={go} signedIn={signedIn} onSignIn={() => setAuthOpen(true)}/>}
      {view === "reviews" && <Reviews open={open}/>}
      {view === "product" && <ProductPage product={product} go={go} add={add}/>}
      {view === "cart" && <CartPage items={cart} remove={remove} go={go}/>}
      {view === "admin" && <AdminDashboard go={go}/>}
    </main>
    <section className="newsletter"><div><p className="kicker">Stay connected</p><h2>Keep your <em>story</em> moving.</h2></div><div><p>New drops, member-only news and no noise.</p>{subscribed ? <p className="success"><Check size={16}/> You’re on the list.</p> : <form onSubmit={(event: FormEvent) => { event.preventDefault(); setSubscribed(true); }}><input type="email" required placeholder="Your email address"/><button>Join <ArrowRight size={15}/></button></form>}</div></section>
    <footer><div className="footer-top"><button className="wordmark" onClick={() => go("home")}>BH <span>Clothing</span></button><p>Wear your story. Your way.</p><div><a href={"mailto:" + contactEmail}><Mail size={15}/> Email</a><a href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a><a href="https://instagram.com/" target="_blank" rel="noreferrer"><AtSign size={15}/> Instagram</a></div></div><div className="footer-bottom"><span>© 2026 BH Clothing</span><button onClick={() => go("reviews")}>Reviews</button><button onClick={() => go("club")}>BH Club</button><span>Privacy · Terms</span></div></footer>
    <button className="chat-trigger" onClick={() => setChat(!chat)}>{chat ? <X/> : <MessageCircle/>}</button>
    {chat && <Assistant onClose={() => setChat(false)}/>}
    {cartOpen && <CartDrawer items={cart} remove={remove} onClose={() => setCartOpen(false)} go={go}/>}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onContinue={() => { setSignedIn(true); setAuthOpen(false); go("account"); }}/>}
  </div>;
}

function Home({ go, open, add }: { go: (view: View) => void; open: (product: Product) => void; add: (product: Product) => void }) {
  return <><section className="hero hero-cards"><div className="hero-copy"><p className="kicker">BH / New season</p><h1>WEAR THE<br/><em>MOMENT</em><span>.</span></h1><p>Pieces with weight, movement and a point of view.</p><button className="primary" onClick={() => go("store")}>Shop new drop <ArrowRight size={16}/></button></div><div className="hero-stack" aria-label="BH Clothing new drop"><article><img src={products[1].image} alt="BH hoodie"/><span>01 / Hoodie</span></article><article><img src={products[0].image} alt="BH T-shirt"/><span>02 / Tee</span></article><article><img src={products[2].image} alt="BH cargo pants"/><span>03 / Bottoms</span></article><div className="hero-bubble"><b>BH</b><span>New drop<br/>available now</span></div></div></section>
  <section className="section"><div className="head"><div><p className="kicker">Just landed</p><h2>New <em>drop</em><span>.</span></h2></div><button className="inline" onClick={() => go("store")}>View all pieces <ArrowRight size={16}/></button></div><div className="product-row">{products.slice(0,4).map((item) => <Card key={item.id} product={item} open={open} add={add}/>)}</div></section>
  <section className="store-promo"><div><p className="kicker">Find your fit</p><h2>The store is<br/>your <em>playlist</em><span>.</span></h2><p>Enter by mood, category, or whatever version of you showed up today.</p><button className="primary light" onClick={() => go("store")}>Explore the store <ArrowRight size={16}/></button></div><button onClick={() => go("store")}><img src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=90" alt="T-shirts on a rack"/><span>Tees · Hoodies · Bottoms · Anime · Accessories</span></button></section>
  <section className="club-preview"><div><p className="kicker">BH Club</p><h2>Built to <em>give back</em><span>.</span></h2><p>Earn BH Points towards future purchases. Join a BH Plan when you want member pricing, early access, and more.</p><div><button onClick={() => go("club")}>Explore BH Points <ArrowRight size={16}/></button><button onClick={() => go("club")}>Explore BH Plans <ArrowRight size={16}/></button></div></div><div className="wallet-preview"><WalletCards size={27}/><p>BH Points wallet</p><strong>1,240 <small>points</small></strong><span>$62.00 in future credit</span></div></section></>;
}

function Store({ listed, category, setCategory, open, add }: { listed: Product[]; category: string; setCategory: (category: string) => void; open: (product: Product) => void; add: (product: Product) => void }) {
  return <section className="page"><div className="intro"><p className="kicker">BH Store</p><h1>Pick your<br/><em>lane</em><span>.</span></h1><p>Every category has its own point of view. Start anywhere.</p></div><div className="category-wall">{categories.map(([name, detail, image]) => <button key={name} className={category === name ? "selected" : ""} onClick={() => setCategory(name)}><img src={image} alt=""/><span><small>{detail}</small><strong>{name}<ArrowRight size={17}/></strong></span></button>)}</div><div className="section store-list"><div className="head"><h2>{category === "All" ? "All pieces" : category}<span>.</span></h2><button className="inline" onClick={() => setCategory("All")}>Show all</button></div><div className="product-grid">{listed.map((item) => <Card key={item.id} product={item} open={open} add={add}/>)}</div></div></section>;
}

function Club({ tab, setTab, go }: { tab: "points" | "plans"; setTab: (tab: "points" | "plans") => void; go: (view: View) => void }) {
  return <section className="club-page"><div className="club-split">
    <ClubPanel kind="plans" title="BH Plans" copy="Monthly membership for better pricing, early access and the benefits that fit your style." onClick={() => setTab("plans")}/>
    <ClubPanel kind="points" title="BH Points" copy="Every purchase comes back to you as future credit or a BH Gift Card." onClick={() => setTab("points")}/>
  </div>
  <div className="club-detail"><div className="tabs"><button className={tab === "plans" ? "active" : ""} onClick={() => setTab("plans")}>BH Plans</button><button className={tab === "points" ? "active" : ""} onClick={() => setTab("points")}>BH Points</button></div>{tab === "points" ? <div className="points"><div><p className="kicker">Your future credit</p><h2>Shop. Earn.<br/><em>Use it later</em><span>.</span></h2><p>Every purchase earns BH Points. Redeem them against a future cart or choose a BH Gift Card.</p><button className="primary" onClick={() => go("account")}>View my wallet <ArrowRight size={16}/></button></div><div className="points-card"><WalletCards size={32}/><span>BH Points balance</span><strong>1,240</strong><p>Available for your next purchase</p><div><b>1,000 points</b><small>= $50 credit or a $50 Gift Card</small></div></div></div> : <div className="plans">{[["BH CORE","Member pricing on selected drops"],["BH PLUS","Early access and stronger member benefits"],["BH BLACK","The full BH Club experience"]].map(([name, feature], index) => <article key={name} className={index === 1 ? "featured" : ""}><p>{name}</p><h2>{name.split(" ")[1]}<span>.</span></h2><strong>Monthly membership</strong><ul><li>{feature}</li><li>Plan-only offers and benefits</li><li>Account prefix: {name}</li></ul><button className="primary" onClick={() => go("account")}>Explore plan <ArrowRight size={16}/></button></article>)}</div>}</div>
  </section>;
}

function ClubPanel({ kind, title, copy, onClick }: { kind: "plans" | "points"; title: string; copy: string; onClick: () => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return <article className={"club-panel " + kind} onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); setOffset({ x: (event.clientX - box.left) / box.width - .5, y: (event.clientY - box.top) / box.height - .5 }); }} onPointerLeave={() => setOffset({ x: 0, y: 0 })}>
    <div className="club-panel-art" style={{ transform: "translate(" + offset.x * 18 + "px," + offset.y * 18 + "px)" }}>{kind === "plans" ? <><CreditCard/><CalendarDays/><Check/></> : <><Coins/><BadgeDollarSign/><WalletCards/></>}</div>
    <div><p className="kicker">{kind === "plans" ? "Membership" : "Reward wallet"}</p><h1>{title}<span>.</span></h1><p>{copy}</p><button onClick={onClick}>Explore {title}<ArrowRight size={17}/></button></div>
  </article>;
}

function Account({ go, signedIn, onSignIn }: { go: (view: View) => void; signedIn: boolean; onSignIn: () => void }) {
  if (!signedIn) return <section className="account-auth"><div><p className="kicker">BH Account</p><h1>Your BH,<br/><em>saved</em><span>.</span></h1><p>Track orders, see your plan and points, build a wishlist and keep your details in one place.</p><button className="primary" onClick={onSignIn}>Sign in or create account <ArrowRight size={16}/></button></div><div className="account-auth-mark"><UserRound size={40}/><span>Points · Plans · Orders · Wishlist</span></div></section>;
  const cards = [[WalletCards,"BH Points wallet","1,240","≈ $62.00 available credit","Use points"],[Sparkles,"My BH Plan","BH CORE","Member benefits are active","View plan"],[PackageCheck,"Orders","02","One order is on its way","Track order"],[Heart,"Wishlist","06","Saved pieces waiting for you","View wishlist"]] as const;
  return <section className="page account"><div className="account-hero"><div><p className="kicker">Your account</p><h1>BH CORE<br/><em>Member</em><span>.</span></h1><p>One place for your plan, wallet, orders and saved pieces.</p><button className="admin-link" onClick={() => go("admin")}>Open BH Admin demo <ArrowRight size={14}/></button></div><b>BH</b></div><div className="account-grid">{cards.map(([Icon, title, value, detail, action]) => <article key={title}><Icon/><p>{title}</p><strong>{value}</strong><small>{detail}</small><button onClick={() => go(title === "Wishlist" ? "store" : "club")}>{action}<ArrowRight size={15}/></button></article>)}</div></section>;
}

function Reviews({ open }: { open: (product: Product) => void }) {
  const [filter, setFilter] = useState("All");
  const items = [[5,"Heavyweight but still comfortable","The cut is perfect and the material feels expensive.",products[0]],[5,"The hoodie I keep reaching for","Exactly the oversized fit I wanted.",products[1]],[3,"Great piece, check the fit","Quality is there; I would prefer a slightly longer length.",products[2]],[4,"Anime without looking costume-y","The detail is subtle and really clean in person.",products[4]]] as const;
  return <section className="page reviews"><div className="intro"><p className="kicker">The BH review room</p><h1>Real <em>opinions</em><span>.</span></h1><p>Read every kind of feedback, then decide for yourself.</p></div><div className="review-summary"><div><strong>4.8</strong><Stars value={5}/><span>From 147 verified reviews</span></div><div>{[5,4,3,2,1].map((value) => <p key={value}><span>{value} star</span><i><b style={{width: (value === 5 ? 76 : value === 4 ? 16 : value === 3 ? 6 : 2) + "%"}}/></i></p>)}</div></div><div className="filters">{["All","Positive","Critical"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="review-list">{items.filter(([score]) => filter === "All" || filter === "Positive" ? score >= 4 : score <= 3).map(([score, title, text, item]) => <article key={title}><div><Stars value={score}/><small>{score}/5</small></div><h3>{title}</h3><p>{text}</p><button onClick={() => open(item)}>View {item.name}<ArrowRight size={15}/></button></article>)}</div></section>;
}

function ProductPage({ product, add, go }: { product: Product; add: (product: Product) => void; go: (view: View) => void }) {
  const [size, setSize] = useState("M"); const [color, setColor] = useState(product.color); const [zoom, setZoom] = useState(false);
  return <section className="product-page"><button className="back" onClick={() => go("store")}><ChevronLeft size={17}/> Back to store</button><div className="product-layout"><div className="gallery"><button className="main-image" onClick={() => setZoom(true)}><img src={product.image} alt={product.name}/><span><ZoomIn size={17}/> Click to zoom</span></button><div className="thumbs">{[product.image, products[(product.id + 1) % products.length].image, products[(product.id + 2) % products.length].image].map((src) => <img key={src} src={src} alt=""/>)}</div></div><div className="product-info"><p className="kicker">BH / {product.category}</p><h1>{product.name}<span>.</span></h1><div className="rating"><Stars value={product.rating}/><button>{product.rating} · {product.reviews} reviews</button></div><strong className="price">{product.price}</strong><p>A premium BH essential built with a considered fit, substantial weight and an easy everyday feel.</p><div className="option"><span>Colour <b>{color}</b></span><div className="swatches">{[product.color,"Black","Ecru"].map((item) => <button key={item} className={color === item ? "active" : ""} onClick={() => setColor(item)}><i className={item === "Black" ? "black" : item === "Ecru" ? "ecru" : "stone"}/></button>)}</div></div><div className="option"><span>Size <button>Size guide</button></span><div className="sizes">{["XS","S","M","L","XL"].map((item) => <button key={item} className={size === item ? "active" : ""} onClick={() => setSize(item)}>{item}</button>)}</div></div><button className="add-bag" onClick={() => add(product)}>Add to bag <span>{product.price}</span></button><div className="benefits"><p><PackageCheck size={17}/> International shipping available</p><p><Heart size={17}/> Easy returns within 30 days</p></div></div></div>{zoom && <div className="zoom" onClick={() => setZoom(false)}><button><X/></button><img src={product.image} alt={product.name + " enlarged"}/></div>}</section>;
}

function CartDrawer({ items, remove, onClose, go }: { items: Product[]; remove: (id: number) => void; onClose: () => void; go: (view: View) => void }) {
  const total = items.reduce((sum, item) => sum + Number(item.price.replace("$", "")), 0);
  return <div className="drawer-layer" onMouseDown={onClose}><aside className="cart-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="kicker">Your bag</p><h2>{items.length ? items.length + " pieces" : "Your bag is empty"}</h2></div><button className="icon" onClick={onClose}><X/></button></div>{items.length ? <><div className="drawer-items">{items.map((item, index) => <article key={item.id + "-" + index}><img src={item.image} alt=""/><div><strong>{item.name}</strong><small>{item.color} · M</small><b>{item.price}</b><button onClick={() => remove(item.id)}>Remove</button></div></article>)}</div><div className="drawer-total"><span>Subtotal</span><b>{"$" + total.toFixed(2)}</b></div><button className="primary full" onClick={() => { onClose(); go("cart"); }}>View full bag <ArrowRight size={16}/></button></> : <div className="empty-cart"><ShoppingBag size={30}/><p>Add something considered. It will appear here.</p><button className="primary" onClick={() => { onClose(); go("store"); }}>Shop the store <ArrowRight size={16}/></button></div>}</aside></div>;
}

function CartPage({ items, remove, go }: { items: Product[]; remove: (id: number) => void; go: (view: View) => void }) {
  const total = items.reduce((sum, item) => sum + Number(item.price.replace("$", "")), 0);
  return <section className="page cart-page"><div className="intro"><p className="kicker">BH Bag</p><h1>Ready when<br/>you <em>are</em><span>.</span></h1><p>International delivery is calculated securely at checkout.</p></div>{items.length ? <div className="cart-layout"><div className="cart-list">{items.map((item, index) => <article key={item.id + "-full-" + index}><img src={item.image} alt=""/><div><p className="kicker">BH / {item.category}</p><h3>{item.name}</h3><small>Colour: {item.color} · Size: M</small><button onClick={() => remove(item.id)}>Remove</button></div><strong>{item.price}</strong></article>)}</div><aside><p>Order summary</p><div><span>Subtotal</span><b>{"$" + total.toFixed(2)}</b></div><div><span>Shipping</span><small>Calculated at checkout</small></div><button className="primary full" onClick={() => alert("Checkout will be connected after BH chooses its secure payment providers.")}>Secure checkout <ArrowRight size={16}/></button><small>BH Points can be applied at the real checkout.</small></aside></div> : <div className="empty-cart page-empty"><ShoppingBag size={35}/><h2>Your bag is waiting<span>.</span></h2><p>Start in the Store and build your next look.</p><button className="primary" onClick={() => go("store")}>Explore Store <ArrowRight size={16}/></button></div>}</section>;
}

function AuthModal({ onClose, onContinue }: { onClose: () => void; onContinue: () => void }) {
  const [mode, setMode] = useState<"email" | "google">("email");
  return <div className="modal-layer" onMouseDown={onClose}><section className="auth-modal" onMouseDown={(event) => event.stopPropagation()}><button className="icon auth-close" onClick={onClose}><X/></button><p className="kicker">BH Account</p><h2>Save your<br/><em>story</em><span>.</span></h2><p>Orders, plans, points and your wishlist — all in one place.</p><button className="google-button" onClick={() => { setMode("google"); onContinue(); }}><b>G</b> Continue with Google</button><div className="auth-divider"><span>or</span></div><form onSubmit={(event) => { event.preventDefault(); onContinue(); }}><label>Email address<input required type="email" placeholder="you@email.com"/></label><button className="primary full">Continue with email <ArrowRight size={16}/></button></form><small>{mode === "google" ? "Google sign-in will be connected before launch." : "This is a prototype — secure authentication will be enabled before launch."}</small></section></div>;
}

function Assistant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState([{ by: "bh", text: "Hi — I’m the BH Assistant. I can help with sizing, delivery, BH Points or finding a piece." }]);
  const [draft, setDraft] = useState("");
  const send = (text = draft) => { const clean = text.trim(); if (!clean) return; setMessages((current) => [...current, { by: "you", text: clean }, { by: "bh", text: "I’ve got you. For a personal answer, our BH team can continue with you on WhatsApp or email." }]); setDraft(""); };
  return <aside className="assistant-chat"><div className="assistant-head"><div><Sparkles size={16}/><div><b>BH Assistant</b><small>Usually replies instantly</small></div></div><button className="icon" onClick={onClose}><X size={18}/></button></div><div className="assistant-thread">{messages.map((message, index) => <p key={index} className={message.by}>{message.text}</p>)}</div><div className="assistant-prompts">{["Help me find my size", "How do BH Points work?", "Delivery question"].map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); send(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask BH anything…"/><button aria-label="Send message"><ArrowRight size={17}/></button></form><div className="assistant-links"><a href="https://wa.me/" target="_blank" rel="noreferrer">Continue on WhatsApp</a><a href={"mailto:" + contactEmail}>Email BH</a></div></aside>;
}

function AdminDashboard({ go }: { go: (view: View) => void }) {
  const metrics = [["Revenue", "$8,240", "+18.4%"], ["Orders", "126", "+12 today"], ["Customers", "2,408", "+34 this week"], ["Conversion", "3.9%", "+0.6%"]];
  return <section className="page admin"><div className="admin-heading"><div><p className="kicker">BH Admin / Demo</p><h1>Control<br/><em>room</em><span>.</span></h1><p>A visual preview of the dashboard BH will use once its real commerce system is connected.</p></div><button className="primary" onClick={() => go("store")}>Back to storefront <ArrowRight size={16}/></button></div><div className="admin-metrics">{metrics.map(([label, value, change]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{change}</small></article>)}</div><div className="admin-grid"><article className="admin-chart"><div><h3>Revenue overview</h3><span>Last 7 days</span></div><div className="chart-bars">{[42,61,52,78,68,88,73].map((height, index) => <i key={index} style={{height: height + "%"}}><small>{["M","T","W","T","F","S","S"][index]}</small></i>)}</div></article><article className="admin-actions"><h3>Manage BH</h3><button><PackageCheck/> Orders & fulfilment <ArrowRight size={15}/></button><button><ShoppingBag/> Products & inventory <ArrowRight size={15}/></button><button><UserRound/> Customers & plans <ArrowRight size={15}/></button><button><BadgeDollarSign/> Payments & payouts <ArrowRight size={15}/></button><button><Sparkles/> Automations <ArrowRight size={15}/></button></article></div><p className="admin-note">Demo data only. Real orders, inventory, analytics, PayPal, cards and Bit need a connected commerce backend and approved payment accounts.</p></section>;
}
