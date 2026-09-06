import { useEffect, useState } from "react";
import { ArrowRight, Gift, X } from "lucide-react";
import { products } from "./catalog";

type Props = { onJoin: () => void };
const seenKey = "bh-welcome-offer-seen-v1";

export function WelcomeOfferModal({ onJoin }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!localStorage.getItem(seenKey)) setOpen(true); }, []);
  const close = () => { localStorage.setItem(seenKey, "1"); setOpen(false); };
  if (!open) return null;
  const images = [products[0].image, products[5].image, products[10].image, products[3].image];
  return <div className="welcome-layer" role="dialog" aria-modal="true" aria-label="BH welcome offer" onMouseDown={close}>
    <section className="welcome-offer" onMouseDown={(event) => event.stopPropagation()}>
      <button className="welcome-close" aria-label="Close offer" onClick={close}><X size={18}/></button>
      <div className="welcome-collage">{images.map((image, index) => <img key={image} className={`welcome-image image-${index + 1}`} src={image} alt=""/>)}</div>
      <div className="welcome-copy"><p className="eyebrow"><Gift size={14}/> NEW TO BH</p><h2>Get <em>10% off</em><br/>your first order<span>.</span></h2><p>Create your BH account and your personal welcome code is ready at checkout. One code per order, always the best valid offer.</p><button className="glow-button" onClick={() => { close(); onJoin(); }}>Create account <ArrowRight size={16}/></button><button className="welcome-skip" onClick={close}>Maybe later</button></div>
    </section>
  </div>;
}
