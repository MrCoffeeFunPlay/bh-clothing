// The BH email design. Builds the complete email (HTML with inline styles and tables, the way email apps need it):
// BH logo, centred title, the message, an optional code box, a button, a signature and the footer.
// The Owner area preview shows exactly this, and the sender will use the same function once email is connected.

export type EmailContent = {
  subject: string;
  body: string;
  buttonLabel: string;
  couponCode: string;
  storeLink: string;
  marketing: boolean;          // marketing emails carry an unsubscribe link
  unsubscribeLink?: string;
};

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const colours = { page: "#f3ebe1", card: "#fffdf9", ink: "#2f2620", text: "#4a3a2f", muted: "#8b7a6c", brand: "#3a2c22", accent: "#c69364", line: "#eadccd" };
const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const serif = "Georgia, 'Times New Roman', serif";

// Paragraphs from blank lines; a {store_link} in the text becomes a link.
function paragraphs(body: string, storeLink: string) {
  return body.trim().split(/\n\s*\n/).filter(Boolean).map((block) => {
    const html = escape(block).replace(/\n/g, "<br>").split("{store_link}").join(`<a href="${escape(storeLink)}" style="color:${colours.brand};font-weight:bold;text-decoration:underline;">bhclothing</a>`);
    return `<p style="margin:0 0 18px;font-family:${serif};font-size:17px;line-height:1.7;color:${colours.text};">${html}</p>`;
  }).join("");
}

export function renderEmail(content: EmailContent) {
  const { subject, body, buttonLabel, couponCode, storeLink, marketing } = content;
  const coupon = couponCode ? `
          <tr><td style="padding:6px 44px 26px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" style="border:1.5px dashed ${colours.accent};border-radius:14px;background:#fbf4ea;">
              <tr><td style="padding:14px 34px;text-align:center;">
                <div style="font-family:${sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${colours.muted};">Your code</div>
                <div style="font-family:${sans};font-size:26px;font-weight:bold;letter-spacing:4px;color:${colours.brand};padding-top:4px;">${escape(couponCode)}</div>
              </td></tr>
            </table>
          </td></tr>` : "";
  const footerNote = marketing
    ? `You're getting this because you chose to receive BH updates. <a href="${escape(content.unsubscribeLink || storeLink + "#account")}" style="color:${colours.muted};text-decoration:underline;">Unsubscribe</a>`
    : "You're getting this email about your BH Clothing account.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:${colours.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colours.page};">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${colours.card};border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(78,49,29,.12);">
        <tr><td align="center" style="background:${colours.brand};padding:30px 20px 26px;">
          <div style="font-family:${sans};font-size:38px;font-weight:bold;letter-spacing:-1px;color:#fffaf4;line-height:1;">BH</div>
          <div style="font-family:${sans};font-size:10px;letter-spacing:6px;text-transform:uppercase;color:${colours.accent};padding-top:8px;">Clothing</div>
        </td></tr>
        <tr><td align="center" style="padding:40px 44px 10px;">
          <h1 style="margin:0;font-family:${sans};font-size:30px;line-height:1.2;font-weight:bold;letter-spacing:-.5px;color:${colours.ink};">${escape(subject)}</h1>
          <div style="width:44px;height:3px;background:${colours.accent};border-radius:3px;margin:18px auto 0;"></div>
        </td></tr>
        <tr><td style="padding:24px 44px 8px;">${paragraphs(body, storeLink)}</td></tr>${coupon}
        <tr><td align="center" style="padding:4px 44px 34px;">
          <a href="${escape(storeLink)}" style="display:inline-block;padding:15px 34px;border-radius:999px;background:${colours.brand};color:#fffaf4;font-family:${sans};font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">${escape(buttonLabel || "Visit BH Clothing")}</a>
        </td></tr>
        <tr><td style="padding:0 44px 34px;">
          <div style="border-top:1px solid ${colours.line};padding-top:22px;font-family:${serif};font-style:italic;font-size:16px;color:${colours.text};">With love,</div>
          <div style="font-family:${sans};font-size:14px;font-weight:bold;letter-spacing:1px;color:${colours.ink};padding-top:4px;">The BH team</div>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td align="center" style="padding:20px 24px 0;font-family:${sans};font-size:11px;line-height:1.7;color:${colours.muted};">
          BH Clothing · Premium Streetwear<br>${footerNote}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
