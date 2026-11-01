import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CurrencyProvider } from "./currency";
import "./styles.css";
import { applyLanguage, storedLanguage } from "./i18n";

// English unless this visitor chose Hebrew before (Account settings → Language).
applyLanguage(storedLanguage(), false);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CurrencyProvider><App /></CurrencyProvider>
  </StrictMode>,
);

// Installable app (PWA): register the service worker on the published site only.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => undefined); });
}
