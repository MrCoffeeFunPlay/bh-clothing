// "Get the BH app": installs the site as an app (PWA). Chrome on Android offers it directly; on iPhone it is added
// from Safari's Share menu, and other Android browsers add it from their menu, so we explain the taps.
// Hidden when already running as the installed app.
import { useEffect, useState } from "react";
import { Download, EllipsisVertical, Share, ShoppingBag, Sparkles, SquarePlus, X, Zap } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const runningAsApp = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const isIPhone = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
const isPhone = () => isIPhone() || isAndroid();

// Chrome fires its install offer once, early, so it is caught here for the footer button and the reminder alike.
let savedPrompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); savedPrompt = event as InstallPrompt; listeners.forEach(tell => tell()); });
  window.addEventListener("appinstalled", () => { savedPrompt = null; listeners.forEach(tell => tell()); });
}

function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(savedPrompt);
  const [installed, setInstalled] = useState(runningAsApp);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    const update = () => { setPrompt(savedPrompt); if (!savedPrompt && runningAsApp()) setInstalled(true); };
    const done = () => setInstalled(true);
    listeners.add(update);
    window.addEventListener("appinstalled", done);
    return () => { listeners.delete(update); window.removeEventListener("appinstalled", done); };
  }, []);
  const install = async () => {
    if (!prompt) { setShowHelp(true); return false; }
    await prompt.prompt();
    const accepted = (await prompt.userChoice).outcome === "accepted";
    if (accepted) setInstalled(true);
    savedPrompt = null; setPrompt(null);
    return accepted;
  };
  return { available: !installed && (!!prompt || isPhone()), direct: !!prompt, install, showHelp, setShowHelp };
}

function InstallSteps({ onClose }: { onClose: () => void }) {
  return <div className="install-help" role="dialog" aria-modal="true" aria-label="Add BH Clothing to your home screen" onClick={onClose}>
    <div onClick={(event) => event.stopPropagation()}>
      <button type="button" className="install-help-close" aria-label="Close" onClick={onClose}><X size={18}/></button>
      <img src="/icons/icon-192.png" alt="" width={64} height={64}/>
      <h3>Add BH Clothing to your home screen</h3>
      {isIPhone()
        ? <ol><li><Share size={16}/> Tap <b>Share</b> at the bottom of Safari</li><li><SquarePlus size={16}/> Choose <b>Add to Home Screen</b></li></ol>
        : <ol><li><EllipsisVertical size={16}/> Open your browser's <b>menu</b> (⋮ or ☰)</li><li><SquarePlus size={16}/> Choose <b>Install app</b> or <b>Add to Home screen</b></li></ol>}
      <p>BH then opens like an app, full screen. Opened BH from Instagram or WhatsApp? Open it in {isIPhone() ? "Safari" : "Chrome"} first.</p>
    </div>
  </div>;
}

export function InstallApp() {
  const { available, install, showHelp, setShowHelp } = useInstall();
  if (!available) return null;
  return <>
    <button type="button" className="install-app" onClick={() => void install()}><Download size={15}/> Get the BH app</button>
    {showHelp && <InstallSteps onClose={() => setShowHelp(false)}/>}
  </>;
}

// A gentle reminder on phones: shown once after a short visit, and again only two weeks after "Not now".
const NUDGE_KEY = "bh-install-nudge";
const NUDGE_DELAY_MS = 12000;
const NUDGE_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
const snoozed = () => {
  try { return Date.now() - Number(localStorage.getItem(NUDGE_KEY) || 0) < NUDGE_SNOOZE_MS; } catch { return true; }
};
const snooze = () => { try { localStorage.setItem(NUDGE_KEY, String(Date.now())); } catch { /* private browsing */ } };

export function InstallNudge() {
  const { available, direct, install, showHelp, setShowHelp } = useInstall();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!available || !isPhone() || snoozed()) return;
    let timer = 0;
    // wait until no other window (welcome offer, sign-in) is open
    const tryShow = () => { if (document.querySelector("[aria-modal='true']")) timer = window.setTimeout(tryShow, 4000); else setOpen(true); };
    timer = window.setTimeout(tryShow, NUDGE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [available]);
  if (!available || (!open && !showHelp)) return null;
  const close = () => { snooze(); setOpen(false); };
  return <>
    {open && <aside className="install-nudge" role="dialog" aria-label="Get the BH Clothing app">
      <button type="button" className="install-nudge-close" aria-label="Not now" onClick={close}><X size={16}/></button>
      <div className="install-nudge-head"><img src="/icons/icon-192.png" alt="" width={54} height={54}/><div><b>BH Clothing app</b><small>Free · no app store needed</small></div></div>
      <ul><li><Zap size={15}/> Opens full screen, in one tap</li><li><ShoppingBag size={15}/> Your bag and orders always close</li><li><Sparkles size={15}/> New drops one tap away</li></ul>
      <div className="install-nudge-actions"><button type="button" className="ghost-pill" onClick={close}>Not now</button><button type="button" className="glow-button" onClick={() => { snooze(); setOpen(false); void install(); }}><Download size={16}/> {direct ? "Install" : "Show me how"}</button></div>
    </aside>}
    {showHelp && <InstallSteps onClose={() => setShowHelp(false)}/>}
  </>;
}
