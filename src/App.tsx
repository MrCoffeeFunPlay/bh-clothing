import { FormEvent, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  AtSign,
  Mail,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  image: string;
  tag?: string;
};

const products: Product[] = [
  {
    id: 1,
    name: "Everyday Heavy Tee",
    category: "Tees",
    price: "$48.00",
    tag: "New",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Studio Zip Hoodie",
    category: "Hoodies",
    price: "$112.00",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Relaxed Cargo",
    category: "Bottoms",
    price: "$96.00",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "After Hours Cap",
    category: "Accessories",
    price: "$38.00",
    tag: "Low stock",
    image:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Panelled Varsity",
    category: "Anime",
    price: "$128.00",
    image:
      "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Core Long Sleeve",
    category: "Tees",
    price: "$62.00",
    image:
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85",
  },
];

const categories = [
  {
    name: "Tees",
    detail: "The everyday uniform",
    image:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Hoodies",
    detail: "Soft structure",
    image:
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Bottoms",
    detail: "Move your way",
    image:
      "https://images.unsplash.com/photo-1506629905607-d9b1f7b7a5b8?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Anime",
    detail: "A world apart",
    image:
      "https://images.unsplash.com/photo-1614583225154-5fc3b0fd1cdd?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Accessories",
    detail: "Finish the look",
    image:
      "https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?auto=format&fit=crop&w=1000&q=85",
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartCount, setCartCount] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.category}`
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const closeMenu = () => setMenuOpen(false);

  const scrollToDrop = () => {
    closeMenu();
    document
      .getElementById("new-drop")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <div className="site-shell">
      <div className="announcement">
        <p>Free shipping on orders over $100</p>
        <button type="button" onClick={scrollToDrop}>
          Shop the drop <ArrowUpRight size={14} strokeWidth={1.8} />
        </button>
      </div>

      <header className="site-header">
        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <a className="wordmark" href="#top" onClick={closeMenu}>
          BH <span>Clothing</span>
        </a>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <a href="#new-drop" onClick={closeMenu}>
            New drop
          </a>
          <a href="#categories" onClick={closeMenu}>
            Shop
          </a>
          <a href="#bh-club" onClick={closeMenu}>
            BH Club
          </a>
          <a href="#story" onClick={closeMenu}>
            Our story
          </a>
        </nav>
        <div className="header-actions">
          <button
            className={`icon-button search-button ${searchOpen ? "active" : ""}`}
            type="button"
            aria-label={searchOpen ? "Close search" : "Open search"}
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <button className="icon-button account-button" type="button" aria-label="Account">
            <UserRound size={20} />
          </button>
          <button className="cart-button" type="button" aria-label={`${cartCount} items in cart`}>
            <ShoppingBag size={20} />
            <span>{cartCount.toString().padStart(2, "0")}</span>
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search-panel">
          <Search size={19} />
          <input
            autoFocus
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search the collection"
            aria-label="Search the collection"
          />
          <span>{filteredProducts.length} pieces</span>
        </div>
      )}

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Chapter 01 / New perspective</p>
            <h1>
              Wear
              <em>Your</em>
              Story<span>.</span>
            </h1>
            <p className="hero-description">
              Elevated everyday pieces for every version of you. Built with intention,
              made to move.
            </p>
            <button className="button button-dark" type="button" onClick={scrollToDrop}>
              Shop new drop <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1400&q=90"
                alt="Model wearing a neutral layered outfit"
              />
            </div>
            <div className="hero-sticker">
              <span>Est.</span>
              <strong>2024</strong>
              <span>Tel Aviv</span>
            </div>
            <p className="image-caption">A study in everyday movement</p>
          </div>
        </section>

        <section className="marquee" aria-label="BH Clothing message">
          <div className="marquee-track">
            <span>Make room for more you</span>
            <i>✳</i>
            <span>Make room for more you</span>
            <i>✳</i>
            <span>Make room for more you</span>
            <i>✳</i>
          </div>
        </section>

        <section className="section drop-section" id="new-drop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 — The edit</p>
              <h2>New drop<span>.</span></h2>
            </div>
            <p className="section-note">
              The latest chapter of essentials, cut for right now.
            </p>
          </div>
          <div className="filter-row" aria-label="Filter products">
            {["All", "Tees", "Hoodies", "Bottoms", "Anime", "Accessories"].map((filter) => (
              <button
                className={activeCategory === filter ? "filter-button active" : "filter-button"}
                type="button"
                key={filter}
                onClick={() => setActiveCategory(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {filteredProducts.map((product, index) => (
              <article className="product-card" key={product.id}>
                <button
                  className="product-image"
                  type="button"
                  aria-label={`Add ${product.name} to cart`}
                  onClick={() => setCartCount((count) => count + 1)}
                >
                  <img src={product.image} alt="" loading={index > 1 ? "lazy" : "eager"} />
                  {product.tag && <span className="product-tag">{product.tag}</span>}
                  <span className="quick-add">
                    <span>Add to bag</span>
                    <ArrowUpRight size={16} />
                  </span>
                </button>
                <div className="product-meta">
                  <div>
                    <p>{product.category}</p>
                    <h3>{product.name}</h3>
                  </div>
                  <strong>{product.price}</strong>
                </div>
              </article>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="empty-results">
              <p>No pieces found for “{searchTerm}”.</p>
              <button type="button" onClick={() => setSearchTerm("")}>
                Clear search
              </button>
            </div>
          )}
        </section>

        <section className="section category-section" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 — Find your lane</p>
              <h2>Shop by mood<span>.</span></h2>
            </div>
            <a className="text-link" href="#new-drop">
              View all <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <button
                className={`category-card category-${index + 1}`}
                type="button"
                key={category.name}
                onClick={() => {
                  setActiveCategory(category.name);
                  document
                    .getElementById("new-drop")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <img src={category.image} alt="" loading="lazy" />
                <span className="category-overlay" />
                <span className="category-content">
                  <small>{category.detail}</small>
                  <strong>
                    {category.name} <ChevronRight size={17} />
                  </strong>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="club-section" id="bh-club">
          <div className="club-copy">
            <p className="eyebrow">03 — Belong to something</p>
            <h2>Welcome to<br /><em>BH Club</em><span>.</span></h2>
            <p>
              More than points. BH Club is a little closer to the people and pieces
              that make you feel most like yourself.
            </p>
            <button className="button button-light" type="button">
              Join the club <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="club-points">
            <div className="points-intro">
              <span className="points-mark">BH</span>
              <div>
                <p>BH Points</p>
                <strong>Earn as you move</strong>
              </div>
            </div>
            <div className="levels">
              <div className="level">
                <span>01</span>
                <div><strong>Observer</strong><small>0 — 499 points</small></div>
              </div>
              <div className="level featured">
                <span>02</span>
                <div><strong>Insider</strong><small>500 — 1,499 points</small></div>
              </div>
              <div className="level">
                <span>03</span>
                <div><strong>Original</strong><small>1,500+ points</small></div>
              </div>
            </div>
            <p className="points-footnote">Every level unlocks a little more.</p>
          </div>
        </section>

        <section className="story-section" id="story">
          <div className="story-image">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85"
              alt="Person standing in a bright studio wearing BH Clothing inspired layers"
              loading="lazy"
            />
            <span>Made for the in-between</span>
          </div>
          <div className="story-copy">
            <p className="eyebrow">A note from BH</p>
            <h2>Clothes are a<br /><em>conversation</em><span>.</span></h2>
            <p>
              We make things for the days that do not fit neatly into a calendar.
              For the first coffee, the late train, the unexpected plan. Pieces with
              enough intention to say something, and enough ease to let you say it.
            </p>
            <a className="text-link" href="#top">
              Read our story <ArrowUpRight size={16} />
            </a>
          </div>
        </section>

        <section className="newsletter-section">
          <div>
            <p className="eyebrow">04 — Stay in the know</p>
            <h2>Keep your<br /><em>story</em> moving<span>.</span></h2>
          </div>
          <div className="newsletter-form-wrap">
            <p>New drops, private edits, and good things for your inbox. No noise.</p>
            {subscribed ? (
              <div className="subscribe-success"><Check size={18} /> You’re on the list. Welcome to BH.</div>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubscribe}>
                <div className="input-wrap">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your email address"
                    aria-label="Your email address"
                    required
                  />
                </div>
                <button className="button button-dark" type="submit">
                  Sign me up <ArrowUpRight size={17} />
                </button>
              </form>
            )}
            <small>By subscribing, you agree to our privacy policy.</small>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <a className="wordmark footer-wordmark" href="#top">
            BH <span>Clothing</span>
          </a>
          <p>Everyday pieces for every version of you.</p>
          <a className="social-link" href="#top" aria-label="Instagram">
            Instagram <AtSign size={16} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>© 2024 BH Clothing</span>
          <div><a href="#top">Privacy</a><a href="#top">Terms</a></div>
          <span>Made with intention</span>
        </div>
      </footer>
    </div>
  );
}

export default App;