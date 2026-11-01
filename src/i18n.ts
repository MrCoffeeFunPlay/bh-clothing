// Hebrew for the shop, as an option (English is the site's main language).
// The page is written in English; when a member picks Hebrew, the text people see is swapped for its Hebrew version
// right in the page, so the layout stays exactly the same and nothing in the shop's logic changes. Text that has no
// Hebrew version (product names, the owner area, the legal papers) stays in English.
import { useEffect, useState } from "react";

export type Language = "en" | "he";
const LANGUAGE_KEY = "bh-language";

export function storedLanguage(): Language {
  try { return localStorage.getItem(LANGUAGE_KEY) === "he" ? "he" : "en"; } catch { return "en"; }
}

// English → Hebrew. Keys are the exact English text (spaces trimmed).
const he: Record<string, string> = {
  // Header, menu and footer
  "Home": "בית", "Store": "חנות", "New Drop": "דרופ חדש", "BH Club": "BH Club", "Shop all": "כל החנות", "All": "הכל",
  "Tees": "חולצות", "Hoodies": "קפוצ'ונים", "Pants": "מכנסיים", "Accessories": "אקססוריז", "Anime": "אנימה",
  "BH Plans": "מסלולי BH", "BH Points": "נקודות BH", "Gift cards": "כרטיסי מתנה", "Gift Cards": "כרטיסי מתנה",
  "My account": "החשבון שלי", "Sign in / Join": "התחברות / הרשמה", "Orders": "הזמנות", "Currency": "מטבע", "Menu": "תפריט", "Close menu": "סגירת התפריט",
  "My profile": "הפרופיל שלי", "Badges": "תגים", "Orders & shipments": "הזמנות ומשלוחים", "Wallet & payments": "ארנק ותשלומים",
  "Account settings": "הגדרות חשבון", "Owner area": "אזור הבעלים", "Sign out": "התנתקות", "Sign in": "התחברות",
  "Search BH Clothing": "חיפוש ב-BH Clothing", "pieces": "פריטים",
  "Stay connected": "נשארים בקשר", "Keep your": "תנו ל", "story": "סיפור", "moving.": "שלכם להמשיך.",
  "New drops, member-only news and no noise.": "דרופים חדשים, חדשות לחברי מועדון ובלי רעש.", "You’re on the list.": "נרשמת לרשימה.",
  "Your email address": "כתובת המייל שלך", "Join": "הצטרפות",
  "Wear your story. Your way.": "לבשו את הסיפור שלכם. בדרך שלכם.", "Email BH": "מייל ל-BH", "Email": "מייל", "WhatsApp BH": "וואטסאפ ל-BH",
  "© 2026 BH Clothing": "© 2026 BH Clothing", "Reviews": "ביקורות", "About us": "עלינו", "FAQ": "שאלות נפוצות", "Privacy": "פרטיות",
  "Terms & conditions": "תנאי שימוש", "Get the BH app": "להורדת אפליקציית BH",
  "Explore the BH collection": "גלו את הקולקציה של BH", "Earn BH Points on every purchase": "צוברים נקודות BH על כל רכישה",
  // Home
  "BH / NEW SEASON": "BH / עונה חדשה", "Built for the": "נבנה בשביל", "everyday": "היומיום",
  "Considered pieces with better weight, better shape and room to move — made for the version of you that shows up.": "פריטים מחושבים עם משקל טוב יותר, גזרה טובה יותר ומקום לזוז — בשביל הגרסה שלך שמופיעה.",
  "Explore the drop": "לדרופ החדש", "Just landed": "הגיע עכשיו", "New": "דרופ", "drop": "חדש", "View all pieces": "לכל הפריטים",
  "Find your fit": "מצאו את הגזרה שלכם", "The store is": "החנות", "your": "היא", "playlist": "הפלייליסט שלכם", "/ BH EDIT": "/ קולקציית BH", "reviews": "ביקורות",
  "Enter by mood, category, or whatever version of you showed up today.": "היכנסו לפי מצב רוח, קטגוריה, או לפי הגרסה שלכם שהגיעה היום.",
  "Explore the store": "לחנות", "Original BH tees · Hoodies · Loose shorts": "חולצות BH מקוריות · קפוצ'ונים · מכנסיים קצרים",
  "The BH point of view": "נקודת המבט של BH", "Less noise.": "פחות רעש.", "More": "יותר", "you": "אתם",
  "BH Clothing is a growing wardrobe for people who want easy, elevated pieces — with anime culture living naturally inside the world, not taking it over.": "BH Clothing היא מלתחה שגדלה בשביל מי שרוצה פריטים פשוטים ומוקפדים — עם תרבות האנימה כחלק טבעי מהעולם, בלי שתשתלט עליו.",
  "Explore piece": "לפריט", "View piece": "לפריט", "Coming soon": "בקרוב", "BH original": "מקורי של BH", "BH ORIGINAL": "מקורי של BH", "Sale": "מבצע",
  // Store and collection
  "BH STORE": "החנות של BH", "Find your": "מצאו את", "next piece": "הפריט הבא", "Pick a category. Every BH edit has its own feel.": "בחרו קטגוריה. לכל קולקציה של BH יש אופי משלה.",
  "Open category": "לקטגוריה", "Choose a category to view its pieces.": "בחרו קטגוריה כדי לראות את הפריטים שלה.",
  "All colours": "כל הצבעים", "All sizes": "כל המידות", "All types": "כל הסוגים", "Back to Store": "חזרה לחנות", "Back to store": "חזרה לחנות",
  "BH COLLECTION": "הקולקציה של BH", "New drop": "דרופ חדש", "Choose your size, colour and your next piece.": "בחרו מידה, צבע ואת הפריט הבא שלכם.",
  "Search this collection": "חיפוש בקולקציה", "Quick size": "מידה מהירה", "No pieces match yet": "אין עדיין פריטים מתאימים",
  "Try another colour, size or search.": "נסו צבע, מידה או חיפוש אחרים.", "Reset filters": "איפוס הסינון",
  "Original BH artwork, built for everyday.": "ציורים מקוריים של BH, בשביל היומיום.", "Pullover weight, drawstrings and kangaroo pockets.": "בד עבה, שרוכים וכיס קנגורו.",
  "Relaxed fit, made to move.": "גזרה רפויה, עשויה לתנועה.", "Caps, bags and finishing pieces.": "כובעים, תיקים והפריטים שמשלימים את הלוק.",
  "Original manga-inspired BH background pieces.": "פריטים מקוריים של BH בהשראת מנגה.",
  // Product page
  "BH /": "BH /", "Coming soon to BH.": "בקרוב ב-BH.", "This piece is locked for now. It will unlock here with photos, sizes and prices when it's released.": "הפריט הזה נעול כרגע. הוא ייפתח כאן עם תמונות, מידות ומחירים כשייצא.",
  "Close zoom": "סגירת ההגדלה", "Click to zoom": "לחצו להגדלה",
  "Product images are digital previews of the BH print on the garment colour, not photos of a finished tee.": "תמונות המוצר הן הדמיות של ההדפס של BH על צבע הבגד, ולא צילומים של חולצה מוכנה.",
  "A premium BH essential built with a considered fit, substantial weight and an easy everyday feel.": "פריט בסיס איכותי של BH עם גזרה מחושבת, בד עבה ותחושה נוחה ליומיום.",
  "Colour": "צבע", "Fabric weight": "משקל הבד", "Heavier, more substantial": "עבה יותר ומלא יותר", "Lighter of the two weights": "הקל מבין השניים",
  "Size": "מידה", "Size guide": "מדריך מידות", "Add to bag": "הוספה לסל", "Choose your size": "בחרו מידה", "Price coming soon": "המחיר יפורסם בקרוב",
  "International shipping available": "יש משלוחים לחו\"ל", "Easy returns within 30 days": "החזרה קלה תוך 30 יום",
  "CUSTOMER REVIEWS": "ביקורות לקוחות", "How it feels": "איך זה מרגיש", "in": "ב", "real life": "חיים האמיתיים", "Based on": "מבוסס על", "verified reviews": "ביקורות מאומתות",
  "LEAVE A REVIEW": "כתבו ביקורת", "Thanks — your review is ready for moderation.": "תודה — הביקורת שלכם ממתינה לאישור.", "Your rating": "הדירוג שלכם",
  "How was the fit, quality or feel?": "איך הגזרה, האיכות או התחושה?", "Send review": "שליחת הביקורת", "Close": "סגירה",
  "White": "לבן", "Black": "שחור", "Navy": "כחול נייבי", "Dark Gray": "אפור כהה", "Beige": "בז'", "Light Blue": "תכלת", "Camel": "קאמל",
  "Gray": "אפור", "Blue": "כחול", "Khaki": "חאקי", "Mint": "מנטה", "Pink": "ורוד", "Red": "אדום", "Yellow": "צהוב",
  "Fallen Sword brings a striking blade, bold Japanese lettering and a red sun into one graphic statement. An oversized silhouette with room to move; choose 220 GSM for a lighter feel or 260 GSM for extra substance.": "Fallen Sword מחברת להב בולט, כתב יפני נועז ושמש אדומה להצהרה גרפית אחת. גזרה אוברסייז עם מקום לזוז; בחרו 220 GSM לתחושה קלה יותר או 260 GSM לבד עבה יותר.",
  "Crossed katana blades meet cherry blossom in Oni Blade — a balance of sharp lines and delicate detail. An oversized everyday silhouette, available in 220 GSM or the heavier 260 GSM.": "להבי קטאנה מוצלבים פוגשים פריחת דובדבן ב-Oni Blade — איזון בין קווים חדים לפרטים עדינים. גזרת אוברסייז ליומיום, ב-220 GSM או ב-260 GSM העבה יותר.",
  "A fierce Oni mask, graphic framing and red accents give Oni Mask its unmistakable edge. Built around an oversized silhouette, with your choice of 220 GSM or a heavier 260 GSM feel.": "מסכת אוני עזה, מסגרת גרפית ונגיעות אדומות נותנות ל-Oni Mask את האופי שלה. גזרת אוברסייז, לבחירתכם ב-220 GSM או ב-260 GSM העבה יותר.",
  "A detailed rose and flowing lettering bring a quieter statement to Rose. An oversized silhouette that lets the artwork speak, available in 220 GSM or the more substantial 260 GSM.": "ורד מפורט וכתב זורם נותנים ל-Rose אמירה שקטה יותר. גזרת אוברסייז שנותנת לציור לדבר, ב-220 GSM או ב-260 GSM העבה יותר.",
  "BH loose shorts, available in multiple colours.": "מכנסיים קצרים רפויים של BH, במגוון צבעים.",
  "Coming soon to BH. This piece is locked for now.": "בקרוב ב-BH. הפריט הזה נעול כרגע.",
  "The Fallen Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.": "הציור של Fallen Sword על קפוצ'ון עבה עם שרוכים וכיס קנגורו.",
  "The Oni Sword artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.": "הציור של Oni Sword על קפוצ'ון עבה עם שרוכים וכיס קנגורו.",
  "The Oni Mask artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.": "הציור של Oni Mask על קפוצ'ון עבה עם שרוכים וכיס קנגורו.",
  "The Rose artwork on a heavyweight pullover hoodie with drawstrings and a kangaroo pocket.": "הציור של Rose על קפוצ'ון עבה עם שרוכים וכיס קנגורו.",
  "Exactly the shape I wanted.": "בדיוק הגזרה שרציתי.", "Clean fit, good weight and feels more premium in person.": "גזרה נקייה, משקל טוב ובמציאות מרגיש עוד יותר איכותי.",
  "Easy piece to style.": "פריט שקל לשלב.", "The fabric feels good and the size guide was accurate.": "הבד מרגיש טוב ומדריך המידות היה מדויק.",
  // Bag
  "Your bag": "הסל שלך", "Your bag is empty": "הסל שלך ריק", "Remove": "הסרה", "Subtotal": "סכום ביניים", "Store sale": "מבצע בחנות",
  "Total before shipping": "סה\"כ לפני משלוח", "View full bag": "לסל המלא", "Add something considered. It will appear here.": "הוסיפו משהו שבחרתם. הוא יופיע כאן.",
  "Open my bag": "לסל שלי", "BH Bag": "הסל של BH", "Ready when": "מוכן כש", "you are": "אתם מוכנים",
  "International delivery is calculated securely at checkout.": "משלוח לחו\"ל מחושב בתשלום המאובטח.", "Colour:": "צבע:", "· Size:": "· מידה:",
  "Order summary": "סיכום הזמנה", "Shipping": "משלוח", "Calculated at checkout": "יחושב בתשלום",
  "Checkout will be connected after BH chooses its secure payment providers.": "התשלום יחובר אחרי ש-BH תבחר את ספקי התשלום המאובטחים שלה.",
  "Secure checkout": "תשלום מאובטח", "BH Points can be applied at the real checkout.": "אפשר יהיה להשתמש בנקודות BH בתשלום האמיתי.",
  "Your bag is waiting": "הסל שלך מחכה", "Start in the Store and build your next look.": "התחילו בחנות ובנו את הלוק הבא שלכם.", "Explore Store": "לחנות",
  "Add +": "הוספה +",
  // BH Club
  "BH CLUB": "BH Club", "Made to feel": "נוצר כדי להרגיש", "personal": "אישי",
  "Choose a monthly BH Plan for member benefits, or earn BH Points that turn into future credit.": "בחרו מסלול BH חודשי עם הטבות לחברים, או צברו נקודות BH שהופכות לזיכוי עתידי.",
  "BH GIFT CARDS": "כרטיסי מתנה של BH", "Give the": "תנו את", "BH feeling": "התחושה של BH",
  "A digital BH Gift Card, sent by email right away or on the day you choose. They pick the piece, size and colour.": "כרטיס מתנה דיגיטלי של BH, שנשלח במייל מיד או ביום שתבחרו. הם בוחרים את הפריט, המידה והצבע.",
  "Any amount you like, from": "כל סכום שתרצו, החל מ-", "favourites:": "הכי פופולריים:", "and": "ו-", "Send a gift card": "שליחת כרטיס מתנה",
  "Turn points into a gift card": "המרת נקודות לכרטיס מתנה", "BH GIFT CARD": "כרטיס מתנה של BH", "for someone you love": "למישהו שאתם אוהבים",
  "Delivery": "משלוח", "By email": "במייל", "Choose the amount": "בחרו סכום", "Pick a set amount or write any amount you like, from $25.": "בחרו סכום קבוע או כתבו כל סכום שתרצו, החל מ-$25.",
  "Send now or later": "עכשיו או אחר כך", "Schedule it for a birthday or a special day.": "תזמנו אותו ליום הולדת או ליום מיוחד.", "Easy to use": "קל לשימוש",
  "They enter the card code at checkout, on any BH piece.": "מזינים את קוד הכרטיס בתשלום, על כל פריט של BH.",
  "MEMBERSHIP": "מנוי", "A plan with": "מסלול עם", "real value": "ערך אמיתי", "Every plan has its own prefix, member-only benefits and calmer, easier shopping.": "לכל מסלול יש קידומת משלו, הטבות לחברים בלבד וקנייה רגועה וקלה יותר.",
  "Plan prefix on your account": "קידומת מסלול בחשבון", "Birthday reward": "הטבת יום הולדת", "Early access to drops": "גישה מוקדמת לדרופים",
  "Member prices & early previews": "מחירים לחברים והצצה מוקדמת", "Extra savings & priority drops": "חיסכון נוסף ועדיפות בדרופים", "The full BH member experience": "חוויית החבר המלאה של BH",
  "REWARDS WALLET": "ארנק ההטבות", "Earn now.": "צוברים עכשיו.", "Use later": "משתמשים אחר כך",
  "BH Points are simple: collect them from purchases, then redeem them as a cart discount or a BH Gift Card.": "נקודות BH פשוטות: צוברים אותן מרכישות, ומממשים כהנחה בסל או ככרטיס מתנה של BH.",
  "Open my wallet": "לארנק שלי", "Gift Card": "כרטיס מתנה", "BH POINTS": "נקודות BH", "points available": "נקודות זמינות", "Reward value": "שווי ההטבה",
  "Buy & collect": "קונים וצוברים", "Points land in your wallet after each eligible purchase.": "הנקודות נכנסות לארנק אחרי כל רכישה מזכה.",
  "Spend your way": "מממשים איך שרוצים", "Use them in a future cart or convert them to a BH Gift Card.": "השתמשו בהן בסל הבא או המירו אותן לכרטיס מתנה של BH.",
  "Add your birthday to your account and unlock your annual member surprise.": "הוסיפו את יום ההולדת שלכם לחשבון וקבלו הפתעה שנתית לחברים.",
  "Your clean entry into BH membership.": "הכניסה הנקייה שלכם למועדון של BH.", "Member pricing on selected pieces": "מחירי חברים על פריטים נבחרים",
  "Early previews before each new drop": "הצצה מוקדמת לפני כל דרופ", "Birthday reward and BH account prefix": "הטבת יום הולדת וקידומת BH בחשבון",
  "More access, more value, less waiting.": "יותר גישה, יותר ערך, פחות המתנה.", "Everything in BH CORE": "כל מה שב-BH CORE", "Extra savings and priority drop access": "חיסכון נוסף ועדיפות בגישה לדרופים",
  "Exclusive member-only edit previews": "הצצות בלעדיות לחברים", "The complete BH member experience.": "חוויית החבר המלאה של BH.", "Everything in BH PLUS": "כל מה שב-BH PLUS",
  "Best member pricing across the store": "מחירי החברים הטובים ביותר בכל החנות", "Priority support and Black-only benefits": "תמיכה בעדיפות והטבות ל-Black בלבד",
  "Back to BH Plans": "חזרה למסלולי BH", "BH MEMBERSHIP": "המנוי של BH", "MONTHLY MEMBERSHIP": "מנוי חודשי", "Cancel anytime from Account settings.": "אפשר לבטל בכל זמן בהגדרות החשבון.",
  "The final checkout will be connected after BH chooses its live payment providers.": "התשלום הסופי יחובר אחרי ש-BH תבחר את ספקי התשלום שלה.", "Continue to checkout": "המשך לתשלום",
  // Gift cards
  "GIFT CARD READY": "כרטיס המתנה מוכן", "Made for": "נוצר בשביל", "GIFT CARD CODE": "קוד כרטיס המתנה", "Back to BH": "חזרה ל-BH", "Back to BH Club": "חזרה ל-BH Club",
  "DIGITAL BH GIFT CARD": "כרטיס מתנה דיגיטלי של BH", "Give them": "תנו להם", "the choice": "את הבחירה", "For": "בשביל", "someone special": "מישהו מיוחד",
  "A digital card for their next BH piece. Pick an amount, make it personal, and choose the card that feels right.": "כרטיס דיגיטלי לפריט הבא שלהם ב-BH. בחרו סכום, הוסיפו מגע אישי ובחרו את הכרטיס שמרגיש נכון.",
  "Pick one of three card looks, make it personal, then send it directly to their inbox.": "בחרו אחד משלושה עיצובים, הוסיפו מגע אישי ושלחו ישר לתיבת המייל שלהם.",
  "01 / VALUE": "01 / סכום", "Choose an amount": "בחרו סכום", "Or enter your amount": "או הזינו סכום משלכם", "Whole dollars only": "דולרים שלמים בלבד",
  "Minimum $25, any amount above it. Whole dollars only.": "מינימום $25, כל סכום מעליו. דולרים שלמים בלבד.", "02 / CARD DESIGN": "02 / עיצוב הכרטיס", "Pick the card": "בחרו כרטיס",
  "03 / DELIVERY": "03 / משלוח", "Make it personal": "מגע אישי", "Send now": "שליחה עכשיו", "Delivered after checkout": "יישלח אחרי התשלום", "Schedule it": "תזמון",
  "Choose a delivery date": "בחרו תאריך משלוח", "Delivery date": "תאריך משלוח", "Recipient name": "שם המקבל/ת", "Who is it for?": "בשביל מי זה?",
  "Recipient email": "המייל של המקבל/ת", "Your name": "השם שלך", "Your message": "ההודעה שלך", "A short note to go with the card.": "כמה מילים שיצורפו לכרטיס.",
  "DIGITAL DELIVERY": "משלוח דיגיטלי", "Ready to send": "מוכן לשליחה", "Gift Card value": "שווי כרטיס המתנה", "SECURE CHECKOUT": "תשלום מאובטח",
  "Choose a payment method. The real integration is added with the live payment provider.": "בחרו אמצעי תשלום. החיבור האמיתי יתווסף עם ספק התשלום.",
  "Your recipient gets a unique, redeemable card code by email.": "המקבל/ת יקבלו במייל קוד כרטיס ייחודי למימוש.", "Payment method": "אמצעי תשלום", "Card": "כרטיס",
  "The recipient receives a unique code to use at checkout. Payment choice appears in the secure checkout step.": "המקבל/ת מקבלים קוד ייחודי לשימוש בתשלום. בחירת אמצעי התשלום מופיעה בשלב התשלום המאובטח.",
  "Secure checkout will be connected after BH chooses its live payment providers.": "התשלום המאובטח יחובר אחרי ש-BH תבחר את ספקי התשלום שלה.",
  "SOMEONE SPECIAL": "מישהו מיוחד", "BH GIFT": "מתנה מ-BH", "Warm Brown": "חום חם", "Ivory Mark": "שנהב", "Night Club": "לילה",
  // Account
  "BH ACCOUNT": "החשבון ב-BH", "Your place": "המקום שלך", "Your profile, reviews and birthday reward, kept calm and organised.": "הפרופיל, הביקורות והטבת יום ההולדת שלך, מסודרים ורגועים.",
  "Sign in or create account": "התחברות או יצירת חשבון", "Made for your next drop.": "מוכן לדרופ הבא שלך.", "Profile · Reviews · Birthday reward": "פרופיל · ביקורות · הטבת יום הולדת",
  "Your session ended. Please sign in again.": "החיבור שלך הסתיים. יש להתחבר שוב.", "Your changes have been saved.": "השינויים נשמרו.",
  "BH OWNER": "הבעלים של BH", "BH MEMBER": "חבר/ת BH", "BH member": "חבר/ת BH", "Welcome back,": "ברוך שובך,",
  "MY PROFILE": "הפרופיל שלי", "Your details": "הפרטים שלך", "Keep your account, reviews and birthday reward up to date.": "שמרו על החשבון, הביקורות והטבת יום ההולדת מעודכנים.",
  "First name": "שם פרטי", "Last name": "שם משפחה", "Email address": "כתובת מייל", "Username for reviews": "שם משתמש לביקורות", "Date of birth": "תאריך לידה",
  "Saving…": "שומר…", "Save changes": "שמירת השינויים",
  "Not connected yet: this section shows an example of what is coming, not your real data.": "עוד לא מחובר: החלק הזה מציג דוגמה למה שיגיע, לא את הנתונים האמיתיים שלך.",
  "WALLET & PAYMENTS": "ארנק ותשלומים", "Your value": "הערך שלך", "BH Points and saved payment methods, ready for your next purchase.": "נקודות BH ואמצעי תשלום שמורים, מוכנים לרכישה הבאה.",
  "BH POINTS BALANCE": "יתרת נקודות BH", "Open BH Points": "לנקודות BH", "SAVED PAYMENT": "אמצעי תשלום שמור", "Default payment method": "אמצעי תשלום ברירת מחדל",
  "Manage": "ניהול", "DELIVERY ADDRESS": "כתובת למשלוח", "Add an address before your first order.": "הוסיפו כתובת לפני ההזמנה הראשונה.", "Edit": "עריכה",
  "ACCOUNT SETTINGS": "הגדרות חשבון", "Stay in control": "השליטה אצלך", "Verify your account, and manage password, messages and account protection.": "אמתו את החשבון ונהלו סיסמה, הודעות ואבטחת חשבון.",
  "BH updates": "עדכונים מ-BH", "New drops and member offers by email.": "דרופים חדשים והטבות לחברים במייל.", "You're getting them; switch off any time.": "את/ה מקבל/ת אותם; אפשר לכבות בכל זמן.",
  "Switch on to get them.": "הפעילו כדי לקבל אותם.", "BH updates by email": "עדכונים מ-BH במייל", "Two-factor verification": "אימות דו-שלבי",
  "Require a confirmation code when signing in on a new device.": "לבקש קוד אישור בהתחברות ממכשיר חדש.", "Password": "סיסמה", "Last changed 3 months ago.": "שונתה לפני 3 חודשים.",
  "Change password": "שינוי סיסמה", "Birthday saved.": "יום ההולדת נשמר.", "BIRTHDAY REWARD": "הטבת יום הולדת", "Set your birthday, get a BH surprise.": "הוסיפו יום הולדת, קבלו הפתעה מ-BH.",
  "Add it once and we'll prepare a birthday reward for your account.": "מוסיפים פעם אחת ואנחנו נכין הטבת יום הולדת לחשבון שלכם.", "Your birthday": "יום ההולדת שלך",
  "Save birthday": "שמירת יום ההולדת", "Edit birthday": "עריכת יום ההולדת", "Add birthday": "הוספת יום הולדת",
  "Add your birthday": "הוסיפו את יום ההולדת שלכם", "Get a BH birthday reward every year. It only takes a second.": "קבלו הטבת יום הולדת מ-BH בכל שנה. זה לוקח שנייה.", "Later": "אחר כך",
  "Verify your account": "אימות החשבון", "Verified": "מאומת", "Phone": "טלפון", "is confirmed. The Verified tag is on your profile.": "אומת. תג המאומת מופיע בפרופיל שלך.",
  "Enter the 6-digit code we sent to": "הזינו את הקוד בן 6 הספרות שנשלח אל", "SMS code": "קוד SMS", "Verify": "אימות", "Change number": "שינוי מספר",
  "Confirm your phone number with an SMS code and get the Verified tag under your name.": "אמתו את מספר הטלפון בקוד SMS וקבלו את תג המאומת מתחת לשם שלכם.",
  "Phone number": "מספר טלפון", "Sending…": "שולח…", "Send code": "שליחת קוד", "Your phone is verified. Your Verified tag is on your profile.": "הטלפון שלך אומת. תג המאומת מופיע בפרופיל שלך.",
  "Check the phone number and include the country code, e.g. +972 50 123 4567.": "בדקו את מספר הטלפון וכללו קידומת מדינה, למשל ‎+972 50 123 4567.",
  // Badges
  "BADGES": "תגים", "Your badges": "התגים שלך", "Badges show under your name on your profile and next to your reviews. Hover or tap a badge to see what it means and how to earn it.": "התגים מופיעים מתחת לשם שלך בפרופיל וליד הביקורות שלך. רחפו או הקישו על תג כדי לראות מה הוא אומר ואיך משיגים אותו.",
  "Loading badges…": "טוען תגים…", "Earned": "הושגו", "Locked": "נעולים", "No badges yet. Start with the ones below.": "אין עדיין תגים. התחילו עם אלה שלמטה.",
  "You have every badge there is. Nice.": "יש לך את כל התגים. יפה.", "Yours as the owner": "שלך בתור הבעלים", "BH Owner": "הבעלים של BH", "Runs BH Clothing.": "מנהל/ת את BH Clothing.",
  "Top Buyer": "קונה מוביל/ה", "Verified their phone number.": "אימת/ה את מספר הטלפון.", "One of our most loyal customers.": "מהלקוחות הנאמנים ביותר שלנו.",
  "Verify your phone number in Account settings.": "אמתו את מספר הטלפון בהגדרות החשבון.", "Given by BH to our most loyal customers.": "ניתן על ידי BH ללקוחות הנאמנים ביותר.",
  "BH Core plan member.": "חבר/ת מסלול BH Core.", "BH Plus plan member.": "חבר/ת מסלול BH Plus.", "BH Black plan member.": "חבר/ת מסלול BH Black.",
  "Comes with the BH Core plan in BH Club (plans open soon).": "מגיע עם מסלול BH Core ב-BH Club (המסלולים ייפתחו בקרוב).",
  "Comes with the BH Plus plan in BH Club (plans open soon).": "מגיע עם מסלול BH Plus ב-BH Club (המסלולים ייפתחו בקרוב).",
  "Comes with the BH Black plan in BH Club (plans open soon).": "מגיע עם מסלול BH Black ב-BH Club (המסלולים ייפתחו בקרוב).",
  // My orders
  "ORDERS & SHIPMENTS": "הזמנות ומשלוחים", "Your orders": "ההזמנות שלך", "Every order, its delivery status and its receipt in one place.": "כל הזמנה, סטטוס המשלוח והקבלה שלה במקום אחד.",
  "on the way": "בדרך", "Loading your orders…": "טוען את ההזמנות שלך…", "No orders yet": "אין עדיין הזמנות", "When you order, it will show up here with its status and receipt.": "כשתזמינו, ההזמנה תופיע כאן עם הסטטוס והקבלה שלה.",
  "Test order": "הזמנת בדיקה", "Track": "מעקב", "Tracking:": "מעקב:", "Tracking appears here once shipped": "המעקב יופיע כאן אחרי המשלוח", "Receipt": "קבלה", "· no receipt": "· אין קבלה",
  "Being prepared": "בהכנה", "Shipped": "נשלחה", "Delivered": "נמסרה", "Cancelled": "בוטלה", "Returned": "הוחזרה", "Not paid": "לא שולמה", "Paid": "שולמה", "Refunded": "הוחזר כסף",
  "Items": "פריטים", "Discount": "הנחה", "Free": "חינם", "Total": "סה\"כ",
  // Sign in
  "BH account": "חשבון BH", "MEMBERS GET MORE": "לחברים יש יותר", "VERIFY EMAIL": "אימות מייל", "One last": "עוד צעד", "step": "אחרון",
  "We sent a code to": "שלחנו קוד אל", ". Enter it below to finish. It can take a minute to arrive; check your spam folder too.": ". הזינו אותו למטה כדי לסיים. זה יכול לקחת דקה; בדקו גם בתיקיית הספאם.",
  "Confirmation code": "קוד אישור", "Checking…": "בודק…", "Verify and continue": "אימות והמשך", "Didn't get it?": "לא הגיע?", "Send the email again": "לשלוח שוב את המייל",
  "Back to log in": "חזרה להתחברות", "Welcome": "ברוך", "back": "שובך", "Create your": "צרו חשבון", "Sign in to reach your profile and BH benefits.": "התחברו כדי להגיע לפרופיל ולהטבות של BH.",
  "Create an account to save your profile, reviews and birthday reward. We'll email you a code to confirm it's you.": "צרו חשבון כדי לשמור פרופיל, ביקורות והטבת יום הולדת. נשלח לכם קוד במייל לאישור.",
  "Continue with": "המשך עם", "or with email": "או עם מייל", "Your password": "הסיסמה שלך", "Signing in…": "מתחבר…", "Log in": "התחברות",
  "Username": "שם משתמש", "Your name for reviews": "השם שלך לביקורות", "Create a password": "בחרו סיסמה", "Password needs": "דרישות הסיסמה", "Confirm password": "אימות סיסמה",
  "Repeat password": "הקלידו שוב את הסיסמה", "Creating…": "יוצר…", "Create and verify email": "יצירה ואימות מייל", "New to BH?": "חדשים ב-BH?", "Create an account": "יצירת חשבון",
  "Already have an account?": "כבר יש לכם חשבון?", "At least 8 characters": "8 תווים לפחות", "Letters (a–z)": "אותיות (a–z)", "Numbers (0–9)": "מספרים (0–9)",
  "Remember me on this device": "לזכור אותי במכשיר הזה", "Send me BH updates: new drops and member offers (optional, you can change this any time)": "שלחו לי עדכונים מ-BH: דרופים חדשים והטבות לחברים (לא חובה, אפשר לשנות בכל זמן)",
  "This email isn't confirmed yet. Enter the code we sent, or send a new one.": "המייל הזה עוד לא אומת. הזינו את הקוד ששלחנו, או שלחו קוד חדש.",
  "The two passwords don't match.": "שתי הסיסמאות לא תואמות.", "Choose a password with at least 8 characters, including letters and numbers.": "בחרו סיסמה עם 8 תווים לפחות, שכוללת אותיות ומספרים.",
  "Your email is confirmed and you're signed in.": "המייל אומת ואת/ה מחובר/ת.", "You're signed in.": "את/ה מחובר/ת.", "You're signed in with Google.": "התחברת עם Google.",
  "We couldn't confirm your email. Please try the link again.": "לא הצלחנו לאמת את המייל. נסו את הקישור שוב.",
  "The email or password is not correct.": "המייל או הסיסמה לא נכונים.", "Confirm your email first: enter the code we sent you.": "קודם צריך לאמת את המייל: הזינו את הקוד ששלחנו.",
  "An account with this email already exists. Log in instead.": "כבר יש חשבון עם המייל הזה. התחברו במקום.", "Your sign-in has expired. Please sign in again.": "החיבור פג. יש להתחבר שוב.",
  "That code is wrong or has expired. Check the message we sent you or send a new code.": "הקוד שגוי או שפג תוקפו. בדקו את ההודעה ששלחנו או שלחו קוד חדש.",
  "Too many attempts. Please wait a minute and try again.": "יותר מדי ניסיונות. חכו דקה ונסו שוב.", "Choose a stronger password (at least 8 characters).": "בחרו סיסמה חזקה יותר (8 תווים לפחות).",
  "Sign-in was cancelled.": "ההתחברות בוטלה.", "Sign-in didn't finish. Please try again.": "ההתחברות לא הסתיימה. נסו שוב.", "Google sign-in didn't finish. Please try again.": "ההתחברות עם Google לא הסתיימה. נסו שוב.",
  "This confirmation link has expired or was already used. Log in, or sign up again for a new link.": "קישור האישור פג או שכבר נעשה בו שימוש. התחברו, או הירשמו שוב לקבלת קישור חדש.",
  "Your details were not saved. Please try again.": "הפרטים לא נשמרו. נסו שוב.", "The picture is too large. Choose one up to 2 MB.": "התמונה גדולה מדי. בחרו תמונה עד 2MB.",
  "The date of birth isn't valid. Please choose a real date.": "תאריך הלידה לא תקין. בחרו תאריך אמיתי.", "One of your details is too long. Please shorten it.": "אחד הפרטים ארוך מדי. קצרו אותו.",
  "The date of birth isn't valid. Please choose a date between 1900 and today.": "תאריך הלידה לא תקין. בחרו תאריך בין 1900 להיום.",
  "Some details aren't valid. Please check them and try again.": "חלק מהפרטים לא תקינים. בדקו ונסו שוב.",
  "The store database could not be reached. Check the connection and try again.": "אין חיבור לחנות. בדקו את החיבור ונסו שוב.",
  // Welcome offer and app
  "NEW TO BH": "חדשים ב-BH", "Get": "קבלו", "10% off": "10% הנחה", "your first order": "על ההזמנה הראשונה",
  "Create your BH account and your personal welcome code is ready at checkout. One code per order, always the best valid offer.": "צרו חשבון ב-BH וקוד הפתיחה האישי שלכם יחכה בתשלום. קוד אחד להזמנה, תמיד ההטבה הטובה ביותר.",
  "Create account": "יצירת חשבון", "Maybe later": "אולי אחר כך", "Close offer": "סגירת ההצעה",
  "Get the BH Clothing app": "להורדת אפליקציית BH Clothing", "BH Clothing app": "אפליקציית BH Clothing", "Free · no app store needed": "חינם · בלי חנות אפליקציות",
  "Opens full screen, in one tap": "נפתחת במסך מלא, בהקשה אחת", "Your bag and orders always close": "הסל וההזמנות תמיד קרובים", "New drops one tap away": "דרופים חדשים במרחק הקשה",
  "Not now": "לא עכשיו", "Install": "התקנה", "Show me how": "הראו לי איך", "Add BH Clothing to your home screen": "הוסיפו את BH Clothing למסך הבית",
  "Tap": "הקישו על", "Share": "שיתוף", "at the bottom of Safari": "בתחתית Safari", "Choose": "בחרו", "Add to Home Screen": "הוספה למסך הבית",
  "Open your browser's": "פתחו את", "menu": "התפריט של הדפדפן", "Install app": "התקנת אפליקציה", "or": "או", "Add to Home screen": "הוספה למסך הבית",
  "BH then opens like an app, full screen. Opened BH from Instagram or WhatsApp? Open it in": "BH תיפתח כמו אפליקציה, במסך מלא. פתחתם את BH מאינסטגרם או מוואטסאפ? פתחו קודם ב-",
  "first.": ".",
  // Assistant
  "BH Concierge": "הקונסיירז' של BH", "Product answers · real support": "תשובות על מוצרים · תמיכה אמיתית", "Fast answers first. Order help goes to the BH team.": "קודם תשובות מהירות. עזרה בהזמנות עוברת לצוות של BH.",
  "Hi — I’m the BH Concierge. Ask about fit, a product, your welcome offer, points or delivery.": "היי — אני הקונסיירז' של BH. שאלו על גזרה, מוצר, הטבת הפתיחה, נקודות או משלוח.",
  "How does my 10% welcome code work?": "איך עובד קוד הפתיחה של 10%?", "Delivery and returns": "משלוחים והחזרות", "Help me find my size": "עזרו לי למצוא מידה",
  "How do BH Points work?": "איך עובדות נקודות BH?", "Delivery & tracking": "משלוח ומעקב", "Returns & exchanges": "החזרות והחלפות",
  "When you register, BH creates a personal 10% welcome code for your first eligible order. One coupon applies per order, so promotions never stack — checkout keeps the best valid offer for you.": "כשנרשמים, BH יוצרת קוד פתיחה אישי של 10% להזמנה הראשונה. קופון אחד להזמנה, כך שהטבות לא מצטברות — בתשלום נשמרת ההטבה הטובה ביותר בשבילכם.",
  "For the relaxed BH fit, start with your usual size. Prefer a closer fit? Go one size down. Tees let you choose 220g or 260g; hoodies and shorts keep one consistent construction.": "לגזרה הרפויה של BH, התחילו עם המידה הרגילה שלכם. מעדיפים צמוד יותר? רדו מידה. בחולצות אפשר לבחור 220g או 260g; בקפוצ'ונים ובמכנסיים יש מבנה אחד קבוע.",
  "BH Points are added after an eligible paid order. The owner controls the earn rate and the value of each point, and your balance stays in your account wallet.": "נקודות BH נוספות אחרי הזמנה מזכה ששולמה. קצב הצבירה ושווי כל נקודה נקבעים על ידי BH, והיתרה נשמרת בארנק החשבון.",
  "Delivery countries, price and estimated arrival appear at checkout once shipping zones are live. Eligible unworn pieces can be requested for return within 30 days of delivery.": "מדינות המשלוח, המחיר וזמן ההגעה יופיעו בתשלום כשאזורי המשלוח יופעלו. אפשר לבקש החזרה של פריטים שלא נלבשו תוך 30 יום מהמסירה.",
  "Each hoodie color has its own front and back gallery. Open the product, choose your color, then use the second thumbnail to view the matching back print.": "לכל צבע קפוצ'ון יש גלריה של חזית וגב. פתחו את המוצר, בחרו צבע, והשתמשו בתמונה הקטנה השנייה כדי לראות את ההדפס בגב.",
  "I can help with sizing, materials, coupons, BH Points, delivery and returns. For an order-specific issue, use WhatsApp or email and the BH team can continue with you.": "אני יכול לעזור עם מידות, חומרים, קופונים, נקודות BH, משלוחים והחזרות. לשאלה על הזמנה מסוימת, פנו בוואטסאפ או במייל וצוות BH ימשיך איתכם.",
  "Continue on WhatsApp": "להמשך בוואטסאפ", "Ask BH anything…": "שאלו את BH כל דבר…", "Send message": "שליחת הודעה", "Back": "חזרה", "Popular questions": "שאלות פופולריות",
  // Information pages
  "BH INFORMATION": "מידע על BH", "About BH": "על BH", "A wardrobe with a point of view": "מלתחה עם נקודת מבט",
  "BH Clothing is a casual-wear brand: elevated everyday pieces with better weight, better shape and room to move. We aren't built around one symbol or one theme. BH is clothing for the way you actually live, and an easy way to wear your story.": "BH Clothing הוא מותג של לבוש יומיומי: פריטים מוקפדים עם משקל טוב יותר, גזרה טובה יותר ומקום לזוז. אנחנו לא בנויים סביב סמל אחד או נושא אחד. BH היא לבוש לחיים שאתם באמת חיים, ודרך קלה ללבוש את הסיפור שלכם.",
  "Quality without compromise": "איכות ללא פשרות",
  "Everything we make is held to one standard, with no shortcuts: chosen fabrics in two weights, a considered fit and careful finishing. If a piece isn't right, it doesn't carry the BH name.": "כל מה שאנחנו מייצרים עומד בסטנדרט אחד, בלי קיצורי דרך: בדים נבחרים בשני משקלים, גזרה מחושבת וגימור קפדני. פריט שלא יצא מושלם לא נושא את השם BH.",
  "Drawn by hand": "מצויר ביד", "Every artwork on our tees starts as a hand-drawn illustration before it ever becomes a print. That's why each BH design has its own character.": "כל ציור על החולצות שלנו מתחיל כאיור שמצויר ביד, עוד לפני שהוא הופך להדפס. לכן לכל עיצוב של BH יש אופי משלו.",
  "Many stories, one wardrobe": "הרבה סיפורים, מלתחה אחת", "Anime is one of our collections, not the whole identity. It lives naturally beside the rest of the wardrobe, and more collections are on the way.": "אנימה היא אחת הקולקציות שלנו, לא כל הזהות. היא חיה בטבעיות לצד שאר המלתחה, ועוד קולקציות בדרך.",
  "The useful answers": "התשובות השימושיות", "Shipping, returns, BH Points and sizing are kept simple. Need a personal answer? The BH Assistant can take you to WhatsApp or email.": "משלוחים, החזרות, נקודות BH ומידות — הכל פשוט. צריכים תשובה אישית? העוזר של BH יעביר אתכם לוואטסאפ או למייל.",
  "Terms & Conditions": "תנאי שימוש", "The clear version": "הגרסה הברורה", "Privacy Policy": "מדיניות פרטיות", "Your details stay yours": "הפרטים שלך נשארים שלך", "Loading…": "טוען…",
  "This page is in English only. The English version is the one that applies.": "העמוד הזה זמין באנגלית בלבד. הנוסח באנגלית הוא הקובע.",
  "Where do you ship?": "לאן אתם שולחים?", "BH is designed for international shipping. Delivery time and price appear at checkout.": "BH מיועדת למשלוחים בינלאומיים. זמן ומחיר המשלוח מופיעים בתשלום.",
  "Can I return something?": "אפשר להחזיר פריט?", "Eligible pieces can be requested for return within 30 days of delivery.": "אפשר לבקש החזרה של פריטים מתאימים תוך 30 יום מהמסירה.",
  "Earn them after eligible purchases; use them later as cart credit or a BH Gift Card.": "צוברים אותן ברכישות מזכות; משתמשים בהן אחר כך כזיכוי בסל או ככרטיס מתנה של BH.",
  // Store errors and states
  "BH Store": "החנות של BH", "Trying again…": "מנסה שוב…", "Try again": "לנסות שוב",
  "We couldn't load the live catalogue, so products and prices are not shown right now. Nothing is lost; please try again in a moment.": "לא הצלחנו לטעון את הקטלוג, ולכן המוצרים והמחירים לא מוצגים כרגע. שום דבר לא אבד; נסו שוב בעוד רגע.",
  "Original price": "מחיר מקורי", "BH SALE": "מבצע BH", "· Ends": "· מסתיים",
  // Language
  "Language": "שפה", "English": "English", "Hebrew": "עברית",
};

// Text that includes a value (a number, an email, a date).
const patterns: [RegExp, string][] = [
  [/^Send the email again in (\d+)s$/, "שליחה חוזרת בעוד $1 שניות"],
  [/^Check (.+) for your confirmation email\.$/, "בדקו את $1 — שם מחכה מייל האישור."],
  [/^A new confirmation email is on its way to (.+)\.$/, "מייל אישור חדש בדרך אל $1."],
  [/^Last updated (.+)\.$/, "עודכן לאחרונה: $1."],
  [/^Obtained (.+)$/, "הושג ב-$1"],
  [/^Not saved: (.+)$/, "לא נשמר: $1"],
  [/^(.+): coming soon$/, "$1: בקרוב"],
  [/^We have (.+) on your account\.$/, "יש לנו את $1 בחשבון שלך."],
  [/^We sent a code by SMS to (.+)\.$/, "שלחנו קוד ב-SMS אל $1."],
  [/^(\d+(?:\.\d+)?)% off your bag$/, "$1% הנחה על הסל"],
  [/^(.+) off your bag$/, "$1 הנחה על הסל"],
  [/^Choose (BH [A-Z]+)$/, "בחירת $1"],
  [/^Continue with (Google|Facebook|Apple)$/, "המשך עם $1"],
  [/^(\d+) out of 5 stars$/, "$1 מתוך 5 כוכבים"],
  [/^— (\d+) colours in (.+)$/, "— $1 צבעים ב-$2"],
  [/^Verified customer · (\d)\/5$/, "לקוח/ה מאומת/ת · $1/5"],
  [/^From (\d+) verified reviews$/, "מתוך $1 ביקורות מאומתות"],
];

export function translate(english: string): string | null {
  const text = english.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (he[text] !== undefined) return he[text];
  for (const [pattern, hebrew] of patterns) if (pattern.test(text)) return text.replace(pattern, hebrew);
  const parts = text.split(" · "); // lists such as "White · Black · Navy"
  if (parts.length > 1 && parts.every((part) => he[part] !== undefined)) return parts.map((part) => he[part]).join(" · ");
  return null;
}

// ---- Swapping the page's text ------------------------------------------------------------------------------------
const SKIP = "script, style, textarea, input, select, [data-no-translate], .admin-shell, .admin-workspace, .legal-text, .faq-list, code";
const ATTRIBUTES = ["placeholder", "aria-label", "title"] as const;
const originalText = new WeakMap<Text, string>();
const shownText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
let observer: MutationObserver | null = null;
const TEXT_NODE = 3, ELEMENT_NODE = 1, SHOW_TEXT = 4; // DOM constants (the same in every browser)
let current: Language = "en";

const SKIP_ATTRIBUTES = "[data-no-translate], .admin-shell, .admin-workspace";
const skipped = (element: Element | null) => !element || Boolean(element.closest(SKIP));
// Headings can have several lines (e.g. "Built for the / everyday."): once one line is Hebrew, the whole heading reads
// right-to-left so its lines stay aligned with each other.
const turnedHeadings = new Set<Element>();
function alignHeading(node: Text) {
  const heading = node.parentElement?.closest("h1, h2");
  if (heading && !heading.hasAttribute("dir")) { heading.setAttribute("dir", "rtl"); turnedHeadings.add(heading); }
}

function swapText(node: Text) {
  const value = node.nodeValue ?? "";
  if (shownText.get(node) === value) return; // our own change
  if (skipped(node.parentElement)) return;
  originalText.set(node, value);
  const hebrew = translate(value);
  if (hebrew === null) { shownText.delete(node); return; }
  const lead = value.match(/^\s*/)![0]; const trail = value.match(/\s*$/)![0];
  const next = lead + hebrew + trail;
  shownText.set(node, next);
  node.nodeValue = next;
  alignHeading(node);
}

function swapAttributes(element: Element) {
  if (!element.isConnected || element.closest(SKIP_ATTRIBUTES)) return;
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name); if (value === null) continue;
    const saved = originalAttributes.get(element) ?? new Map<string, string>();
    const hebrew = translate(value);
    if (saved.get(`shown:${name}`) === value) continue;
    saved.set(name, value);
    if (hebrew !== null) { saved.set(`shown:${name}`, hebrew); element.setAttribute(name, hebrew); }
    originalAttributes.set(element, saved);
  }
}

function swapTree(root: Node) {
  if (root.nodeType === TEXT_NODE) { swapText(root as Text); return; }
  if (root.nodeType !== ELEMENT_NODE) return;
  const element = root as Element;
  swapAttributes(element);
  element.querySelectorAll(ATTRIBUTES.map((name) => `[${name}]`).join(",")).forEach(swapAttributes);
  if (skipped(element)) return;
  const walker = document.createTreeWalker(element, SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) swapText(node as Text);
}

function restoreTree(root: Element) {
  const walker = document.createTreeWalker(root, SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const original = originalText.get(node);
    if (original !== undefined && shownText.get(node) === node.nodeValue) node.nodeValue = original;
    shownText.delete(node);
  }
  root.querySelectorAll(ATTRIBUTES.map((name) => `[${name}]`).join(",")).forEach((element) => {
    const saved = originalAttributes.get(element); if (!saved) return;
    for (const name of ATTRIBUTES) if (saved.has(name) && saved.get(`shown:${name}`) === element.getAttribute(name)) element.setAttribute(name, saved.get(name)!);
    originalAttributes.delete(element);
  });
  turnedHeadings.forEach((heading) => heading.removeAttribute("dir")); turnedHeadings.clear();
}

export function currentLanguage(): Language { return current; }

// For parts that pick their own Hebrew text (e.g. FAQ answers saved in Hebrew by the owner).
export function useLanguage(): Language {
  const [language, setLanguage] = useState<Language>(current);
  useEffect(() => { const update = () => setLanguage(current); window.addEventListener("bh-language", update); return () => window.removeEventListener("bh-language", update); }, []);
  return language;
}

export function applyLanguage(language: Language, remember = true) {
  if (remember) { try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* private browsing */ } }
  if (language === current && (language === "en" || observer)) return;
  current = language;
  const root = document.documentElement;
  root.lang = language;
  root.classList.toggle("lang-he", language === "he");
  if (language === "he") {
    swapTree(document.body);
    observer = new window.MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === "characterData") swapText(change.target as Text);
        else if (change.type === "attributes") swapAttributes(change.target as Element);
        else change.addedNodes.forEach(swapTree);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES] });
  } else {
    observer?.disconnect(); observer = null;
    restoreTree(document.body);
  }
  window.dispatchEvent(new window.CustomEvent("bh-language", { detail: language }));
}
