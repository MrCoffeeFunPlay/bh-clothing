// "Continue with Google" opened from BH's own site (Google Identity Services). Until Google's button is ready, or if
// it can't load (blocked or offline), the regular sign-in link is shown instead, so signing in always works.
import { type ReactNode, useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, googleNonce } from "./catalogStore";

type GoogleId = {
  initialize: (options: { client_id: string; nonce: string; callback: (answer: { credential?: string }) => void; use_fedcm_for_button?: boolean; itp_support?: boolean }) => void;
  renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
};
declare global { interface Window { google?: { accounts?: { id?: GoogleId } } } }

let loading: Promise<GoogleId> | null = null;
function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client"; script.async = true;
    script.onload = () => window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("Google sign-in did not load"));
    script.onerror = () => { loading = null; reject(new Error("Google sign-in did not load")); };
    document.head.appendChild(script);
  });
  return loading;
}

export function GoogleButton({ fallback, onToken, onError }: { fallback: ReactNode; onToken: (idToken: string, rawNonce: string) => void; onError: (message: string) => void }) {
  const slot = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [google, nonce] = await Promise.all([loadGoogle(), googleNonce()]);
        if (!active || !slot.current) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID, nonce: nonce.hashed, use_fedcm_for_button: true, itp_support: true,
          callback: (answer) => answer.credential ? onToken(answer.credential, nonce.raw) : onError("Google sign-in didn't finish. Please try again."),
        });
        google.renderButton(slot.current, { type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with", logo_alignment: "center", width: Math.min(400, slot.current.offsetWidth || 400) });
        setReady(true);
      } catch { /* keep the regular sign-in link */ }
    })();
    return () => { active = false; };
  }, []);
  return <div className="google-button-wrap"><div ref={slot} className={ready ? "google-gis" : "google-gis waiting"} aria-hidden={!ready}/>{!ready && fallback}</div>;
}
