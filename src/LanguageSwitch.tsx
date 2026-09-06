import { Languages } from "lucide-react";
import { useEffect, useState } from "react";

const key = "bh-locale-v1";

export function LanguageSwitch() {
  const [locale, setLocale] = useState<"en" | "he">("en");
  useEffect(() => {
    const saved = localStorage.getItem(key) as "en" | "he" | null;
    const next = saved || (navigator.language.toLowerCase().startsWith("he") ? "he" : "en");
    setLocale(next); document.documentElement.lang = next; document.documentElement.dir = next === "he" ? "rtl" : "ltr";
  }, []);
  const toggle = () => { const next = locale === "en" ? "he" : "en"; setLocale(next); localStorage.setItem(key, next); document.documentElement.lang = next; document.documentElement.dir = next === "he" ? "rtl" : "ltr"; };
  return <button className="language-switch" onClick={toggle} title="Language preference"><Languages size={15}/><span>{locale === "en" ? "עב" : "EN"}</span></button>;
}
