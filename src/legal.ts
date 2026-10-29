// The privacy policy and terms of use, written to match what the site actually does today. They are a plain-language
// starting point, not legal advice: have them reviewed by a professional before orders open.
export const LEGAL_UPDATED = "29 October 2026";
export const BUSINESS_EMAIL = "benharclothing@gmail.com";

export type LegalSection = { heading: string; paragraphs?: string[]; points?: string[] };

export const privacySections: LegalSection[] = [
  { heading: "Who we are", paragraphs: [`BH Clothing is an Israeli clothing brand. This policy explains what we keep about you when you use bhclothing.fashion and the BH app, and why. Questions or requests: ${BUSINESS_EMAIL}.`] },
  { heading: "What we keep", points: [
    "Your account: your email address and your password. The password is handled by our sign-in service and stored in a protected (hashed) form; we never see it.",
    "Your profile, if you fill it in: first and last name, username, date of birth, country and profile picture.",
    "Sign-in with Google, if you choose it: Google shares your name and email address with us. We don't receive your Google password.",
    "Your phone number, only if you verify your account with it.",
    "Whether you want BH updates (new drops and member offers by email), and when you said yes.",
    "Your bag (the pieces, colours and sizes you added) and your orders: the pieces, prices, delivery address, phone number and order status.",
    "Member tags shown on your profile, such as Verified.",
  ] },
  { heading: "What stays in your browser", paragraphs: ["Your sign-in (so you stay signed in if you choose \"Remember me\"), a visitor's bag before signing in, your currency choice, whether you've seen the welcome offer, and copies of site files and images so the BH app opens quickly. You can clear these in your browser settings at any time."] },
  { heading: "How we use it", points: [
    "To run your account, your bag and your orders, and to show your profile and tags.",
    "To send account emails, such as your sign-up confirmation code.",
    "To send BH updates only if you switched them on. You can switch them off in Account settings at any time, and every update email has an unsubscribe link.",
    "Your date of birth is used only for a birthday reward.",
  ] },
  { heading: "Payments", paragraphs: ["BH does not take payments on the site yet. When payments open, they will be handled by a licensed payment provider; BH will not store card numbers, and this policy will be updated before then."] },
  { heading: "Who handles it for us", points: [
    "Supabase: our database, sign-in and image storage.",
    "Netlify: hosts the website.",
    "Google: only if you sign in with Google. Our site's fonts are also loaded from Google Fonts.",
    "An SMS service: only to send your phone verification code, once phone verification is switched on.",
  ], paragraphs: ["We don't sell your details or share them for advertising, and the site has no advertising or tracking scripts."] },
  { heading: "Your choices and rights", points: [
    "See and change your profile at any time in your account.",
    "Switch BH updates on or off in Account settings.",
    `Ask for a copy of your details, a correction, or for your account to be deleted, by emailing ${BUSINESS_EMAIL}.`,
  ], paragraphs: ["Under Israel's Privacy Protection Law you may review the information kept about you and ask for it to be corrected."] },
  { heading: "How long we keep it", paragraphs: ["Account details are kept while your account exists. Orders are business records and are kept for as long as the law requires, even if you delete your account."] },
  { heading: "Changes", paragraphs: ["If this policy changes, the new version will appear here with a new date."] },
];

export const termsSections: LegalSection[] = [
  { heading: "About these terms", paragraphs: [`These terms apply to bhclothing.fashion and the BH app, run by BH Clothing (Israel). Contact: ${BUSINESS_EMAIL}.`] },
  { heading: "The store today", points: [
    "Orders and payments are not open yet. Prices, colours and pieces shown may change before they go on sale.",
    "Product images are digital previews of the BH prints on the garments, not photos of finished pieces.",
    "Pieces marked \"Coming soon\" can't be bought yet.",
    "Gift cards and BH Club plans are shown as previews and are not on sale yet.",
  ] },
  { heading: "Before orders open", paragraphs: ["BH will publish its full sale, delivery, cancellation and returns terms here before taking any order, as Israeli consumer protection law requires."] },
  { heading: "Your account", points: [
    "Keep your details accurate and your password private.",
    "One account per person. Don't use someone else's email or phone number.",
    "BH may suspend an account that is used to misuse the site.",
  ] },
  { heading: "BH designs", paragraphs: ["The BH name, logo, prints and images are owned by BH Clothing. Please don't copy or sell them."] },
  { heading: "Law", paragraphs: ["These terms are governed by the laws of the State of Israel."] },
  { heading: "Changes", paragraphs: ["If these terms change, the new version will appear here with a new date."] },
];
