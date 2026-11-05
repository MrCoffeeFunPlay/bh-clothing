import { FormEvent, useState } from "react";
import { ArrowRight, CircleHelp, MessageCircle, Send, Sparkles, X } from "lucide-react";

type Message = { by: "bh" | "you"; text: string };
const quick = ["Help me find my size", "How does my 10% welcome code work?", "Delivery and returns", "How do BH Points work?"];

function answer(question: string) {
  const value = question.toLowerCase();
  if (value.includes("coupon") || value.includes("discount") || value.includes("10%") || value.includes("welcome")) return "Create a BH account and enter WELCOME10 at checkout for 10% off your first order. It works once per customer, and one offer applies per order: checkout keeps the better one for you.";
  if (value.includes("size") || value.includes("fit")) return "For the relaxed BH fit, start with your usual size. Prefer a closer fit? Go one size down. Tees let you choose 220g or 260g; hoodies and shorts keep one consistent construction.";
  if (value.includes("point")) return "BH Points will start with paid orders. Your balance will show in your account wallet.";
  if (value.includes("ship") || value.includes("delivery") || value.includes("return")) return "Delivery countries, prices and our returns policy will be published before orders open. For anything specific, write to us on WhatsApp or email.";
  if (value.includes("hoodie") || value.includes("back")) return "Each hoodie color has its own front and back gallery. Open the product, choose your color, then use the second thumbnail to view the matching back print.";
  return "I can help with sizing, materials, coupons, BH Points, delivery and returns. For an order-specific issue, use WhatsApp or email and the BH team can continue with you.";
}

export function AssistantV2({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ by: "bh", text: "Hi — I’m the BH Concierge. Ask about fit, a product, your welcome offer, points or delivery." }]);
  const [draft, setDraft] = useState("");
  const send = (text = draft) => { const clean = text.trim(); if (!clean) return; setMessages((current) => [...current, { by: "you", text: clean }, { by: "bh", text: answer(clean) }]); setDraft(""); };
  const submit = (event: FormEvent) => { event.preventDefault(); send(); };
  return <aside className="assistant-chat concierge-chat"><div className="assistant-head"><div><Sparkles size={18}/><div><b>BH Concierge</b><small>Product answers · real support</small></div></div><button className="icon" onClick={onClose}><X size={18}/></button></div><div className="concierge-note"><CircleHelp size={15}/><span>Fast answers first. Order help goes to the BH team.</span></div><div className="assistant-thread">{messages.map((message, index) => <p key={index} className={message.by}>{message.text}</p>)}</div><div className="assistant-prompts">{quick.map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div><form onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask BH anything…"/><button aria-label="Send message"><Send size={16}/></button></form><div className="assistant-links"><a href="https://wa.me/" target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowRight size={13}/></a><a href="mailto:benharclothing@gmail.com">Email BH</a></div></aside>;
}
