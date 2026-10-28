// "Get the BH app": installs the site as an app (PWA). Android/Chrome offer it directly; on iPhone it is added from
// Safari's Share menu, so we explain the two taps. Hidden when already running as the installed app.
import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const runningAsApp = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const isIPhone = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(runningAsApp);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    const offer = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", offer); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed || (!prompt && !isIPhone())) return null;
  const install = async () => {
    if (!prompt) { setShowHelp(true); return; }
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };
  return <>
    <button type="button" className="install-app" onClick={() => void install()}><Download size={15}/> Get the BH app</button>
    {showHelp && <div className="install-help" role="dialog" aria-modal="true" aria-label="Add BH to your home screen" onClick={() => setShowHelp(false)}>
      <div onClick={(event) => event.stopPropagation()}>
        <button type="button" className="install-help-close" aria-label="Close" onClick={() => setShowHelp(false)}><X size={18}/></button>
        <img src="/icons/icon-192.png" alt="" width={64} height={64}/>
        <h3>Add BH to your home screen</h3>
        <ol><li><Share size={16}/> Tap <b>Share</b> at the bottom of Safari</li><li><SquarePlus size={16}/> Choose <b>Add to Home Screen</b></li></ol>
        <p>BH then opens like an app, full screen.</p>
      </div>
    </div>}
  </>;
}
