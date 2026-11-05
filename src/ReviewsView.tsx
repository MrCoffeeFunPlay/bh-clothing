// Real reviews: on each product page, on the Reviews page, and the owner's tool to hide or show them.
// Only members who bought a piece (a paid order) can review it, once; they can edit their review.
import { type FormEvent, useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Check, Eye, EyeOff, MessageCircle, ShieldCheck, Star, X } from "lucide-react";
import type { Product } from "./catalog";
import { fetchAllReviews, fetchMyReview, fetchReviewStats, fetchReviews, hasBought, saveReview, setReviewStatus, type AdminReview, type MyReview, type PublicReview, type ReviewStat, type UserSession } from "./catalogStore";

type Fresh = () => Promise<UserSession | null>;
const messageOf = (problem: unknown) => problem instanceof Error ? problem.message : String(problem);
const reviewDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function ReviewStars({ value, size = 13 }: { value: number; size?: number }) {
  return <span className="stars" aria-label={`${Math.round(value)} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={size} fill={index < Math.round(value) ? "currentColor" : "none"}/>)}</span>;
}

// Averages for every piece, loaded once per visit.
let statsCache: Promise<ReviewStat[]> | null = null;
export function useReviewStats() {
  const [stats, setStats] = useState<ReviewStat[]>([]);
  useEffect(() => { statsCache ??= fetchReviewStats().catch(() => { statsCache = null; return []; }); void statsCache.then(setStats); }, []);
  return stats;
}
export const forgetReviewStats = () => { statsCache = null; };

function ReviewCard({ review, product }: { review: PublicReview; product?: Product }) {
  return <article className="real-review">
    <div className="real-review-top"><ReviewStars value={review.rating}/><small>{reviewDate(review.created_at)}</small></div>
    {review.title && <h3>{review.title}</h3>}
    <p>{review.body}</p>
    <small className="review-author"><BadgeCheck size={13}/> {review.author} · Verified buyer{product ? <> · {product.name}</> : null}</small>
  </article>;
}

export function ProductReviews({ product, freshSession, signedIn, openAuth }: { product: Product; freshSession: Fresh; signedIn: boolean; openAuth: () => void }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [mine, setMine] = useState<MyReview | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [draft, setDraft] = useState({ rating: 0, title: "", body: "" });
  const [hover, setHover] = useState(0);
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [problem, setProblem] = useState("");
  const load = async () => {
    setReviews(await fetchReviews(product.id).catch(() => []));
    if (!signedIn) { setMine(null); setCanReview(false); return; }
    const session = await freshSession(); if (!session) return;
    const [bought, own] = await Promise.all([hasBought(product.id, session).catch(() => false), fetchMyReview(product.id, session).catch(() => null)]);
    setCanReview(bought); setMine(own);
    if (own) setDraft({ rating: own.rating, title: own.title, body: own.body });
  };
  useEffect(() => { void load(); }, [product.id, signedIn]);
  const list = reviews ?? [];
  const average = list.length ? Math.round(list.reduce((sum, review) => sum + review.rating, 0) / list.length * 10) / 10 : 0;
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (!draft.rating || draft.body.trim().length < 2) return;
    setState("saving"); setProblem("");
    void (async () => {
      try { const session = await freshSession(); if (!session) throw new Error("Your session ended. Please sign in again."); setMine(await saveReview({ id: mine?.id, product_id: product.id, ...draft }, session)); forgetReviewStats(); setEditing(false); setState("saved"); setReviews(await fetchReviews(product.id).catch(() => list)); }
      catch (error) { setProblem(messageOf(error)); setState("idle"); }
    })();
  };
  const shown = hover || draft.rating;
  const form = <form className="review-form" onSubmit={submit}>
    <p className="eyebrow"><MessageCircle size={14}/> {mine ? "EDIT YOUR REVIEW" : "LEAVE A REVIEW"}</p>
    <div className="review-stars" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map((item) => <button type="button" role="radio" key={item} aria-checked={draft.rating === item} className={item <= shown ? "active" : ""} onMouseEnter={() => setHover(item)} onClick={() => setDraft({ ...draft, rating: item })} aria-label={`${item} out of 5 stars`}><Star size={18} fill={item <= shown ? "currentColor" : "none"}/></button>)}</div>
    <input maxLength={80} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="A title (optional)"/>
    <textarea required minLength={2} maxLength={1000} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="How was the fit, quality or feel?"/>
    {problem && <p className="coupon-message error" role="alert">{problem}</p>}
    <button className="glow-button" disabled={!draft.rating || state === "saving"}>{state === "saving" ? "Sending…" : mine ? "Save my review" : "Send review"} <ArrowRight size={16}/></button>
  </form>;
  return <section className="product-reviews">
    <div><p className="eyebrow"><Star size={14}/> CUSTOMER REVIEWS</p><h2>How it feels<br/>in <em>real life</em><span>.</span></h2>
      {list.length > 0 ? <div className="product-review-score"><strong>{average}</strong><div><ReviewStars value={average}/><span>{list.length === 1 ? "1 review from a verified buyer" : `${list.length} reviews from verified buyers`}</span></div></div>
        : reviews !== null && <p className="reviews-empty">No reviews yet. Reviews come only from customers who bought this piece.</p>}
    </div>
    {list.length > 0 && <div className="product-review-list">{list.map((review) => <ReviewCard key={review.id} review={review}/>)}</div>}
    {mine && !editing ? <div className="review-form review-mine"><p className="review-success"><Check size={18}/> {state === "saved" ? "Thanks — your review is up." : "You reviewed this piece."}{mine.status === "hidden" && " It is hidden by BH."}</p><button className="ghost-pill" onClick={() => setEditing(true)}>Edit my review</button></div>
      : canReview ? form
      : <div className="review-form review-locked"><ShieldCheck size={18}/><p>{signedIn ? "You can review this piece after you buy it." : "Bought this piece? Sign in to review it."}</p>{!signedIn && <button className="ghost-pill" onClick={openAuth}>Sign in</button>}</div>}
  </section>;
}

export function ReviewsPage({ products, open }: { products: Product[]; open: (product: Product) => void }) {
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [filter, setFilter] = useState<"All" | "Positive" | "Critical">("All");
  useEffect(() => { fetchReviews().then(setReviews).catch(() => setReviews([])); }, []);
  const list = reviews ?? [];
  const average = list.length ? Math.round(list.reduce((sum, review) => sum + review.rating, 0) / list.length * 10) / 10 : 0;
  const count = (stars: number) => list.filter((review) => review.rating === stars).length;
  const shown = list.filter((review) => filter === "All" || (filter === "Positive" ? review.rating >= 4 : review.rating <= 3));
  return <section className="page reviews">
    <div className="intro"><p className="kicker">The BH review room</p><h1>Real <em>opinions</em><span>.</span></h1><p>Every review here comes from a customer who bought the piece.</p></div>
    {reviews === null ? <p className="reviews-empty page-pad">Loading…</p> : list.length === 0 ? <div className="reviews-empty page-pad"><ShieldCheck size={22}/><p><b>No reviews yet.</b> The first reviews will appear here after the first orders arrive. Only customers who bought a piece can review it.</p></div> : <>
      <div className="review-summary"><div><strong>{average}</strong><ReviewStars value={average}/><span>{list.length === 1 ? "From 1 verified buyer" : `From ${list.length} verified buyers`}</span></div><div>{[5, 4, 3, 2, 1].map((value) => <p key={value}><span>{value} star</span><i><b style={{ width: `${Math.round(count(value) / list.length * 100)}%` }}/></i></p>)}</div></div>
      <div className="filters">{(["All", "Positive", "Critical"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="review-list">{shown.map((review) => { const product = products.find((item) => item.id === review.product_id); return <div key={review.id} className="review-list-item"><ReviewCard review={review} product={product}/>{product && <button onClick={() => open(product)}>View {product.name}<ArrowRight size={15}/></button>}</div>; })}</div>
    </>}
  </section>;
}

export function ReviewsAdmin({ freshSession, products }: { freshSession?: Fresh; products: Product[] }) {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [problem, setProblem] = useState("");
  const run = async (work: (token: string) => Promise<void>) => {
    setProblem("");
    try { const session = await freshSession!(); if (!session) throw new Error("Your session ended. Please sign in again."); await work(session.accessToken); }
    catch (error) { setProblem(messageOf(error)); }
  };
  const reload = (token: string) => fetchAllReviews(token).then(setReviews);
  useEffect(() => { if (freshSession) void run(reload); }, []);
  const head = <div className="workspace-head"><div><p className="eyebrow"><Star size={14}/> REVIEWS</p><h2>What buyers say<span>.</span></h2></div></div>;
  if (!freshSession) return <>{head}<p className="admin-copy">Reviews are saved in the live store database. Sign in to the live store to see them.</p></>;
  return <div className="reviews-admin">{head}
    <p className="admin-copy">Only customers with a paid order can review a piece. You can hide a review (it stays saved) and show it again. Every change is in the activity log.</p>
    {problem && <p className="save-banner save-fail" role="alert"><X size={17}/>{problem}</p>}
    <div className="faq-admin-list">{reviews === null ? <p className="admin-copy">Loading reviews…</p> : reviews.length === 0 ? <p className="admin-copy">No reviews yet. They start once paid orders arrive.</p> : reviews.map((review) => <article key={review.id} className={review.status === "hidden" ? "hidden-question" : ""}>
      <div><ReviewStars value={review.rating}/> <b>{review.title || "(no title)"}</b><p>{review.body}</p><small>{products.find((item) => item.id === review.product_id)?.name ?? "A piece"} · {reviewDate(review.created_at)}{review.status === "hidden" && " · Hidden"}</small></div>
      <div className="faq-admin-actions"><button className="icon" aria-label={review.status === "hidden" ? "Show" : "Hide"} onClick={() => void run(async (token) => { await setReviewStatus(review.id, review.status === "hidden" ? "published" : "hidden", token); forgetReviewStats(); await reload(token); })}>{review.status === "hidden" ? <Eye size={15}/> : <EyeOff size={15}/>}</button></div>
    </article>)}</div>
  </div>;
}
