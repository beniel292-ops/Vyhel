/** Branded, table-based email templates (inline styles for broad client support). */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(opts: { preheader: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Vyhel</title></head>
<body style="margin:0;padding:0;background:#F7F5F0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 4px 24px 4px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:6px;color:#171717;">VYHEL</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #DDDAD2;border-radius:10px;padding:36px 32px;font-family:Helvetica,Arial,sans-serif;color:#171717;">
${opts.body}
</td></tr>
<tr><td style="padding:24px 4px 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6B6B66;">${opts.footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function purchaseEmail(p: {
  customerName: string | null;
  productName: string;
  orderId: string;
  amount: string;
  paidAt: Date;
  downloadUrl: string;
  expiresAt: Date;
  maxDownloads: number;
  supportEmail: string | null;
  siteUrl: string;
}) {
  const hello = p.customerName ? `Hi ${esc(p.customerName.split(" ")[0])},` : "Hi,";
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(p.paidAt);
  const expires = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(p.expiresAt);
  const support = p.supportEmail
    ? `Questions or trouble downloading? Reply to this email or write to <a href="mailto:${esc(p.supportEmail)}" style="color:#3F4E3D;">${esc(p.supportEmail)}</a>.`
    : "Questions or trouble downloading? Just reply to this email.";
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;font-size:13px;color:#6B6B66;">${k}</td><td style="padding:6px 0;font-size:13px;color:#171717;text-align:right;">${v}</td></tr>`;
  const html = layout({
    preheader: `Your download for ${p.productName} is ready.`,
    body: `
<p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#52634F;font-weight:700;">Purchase confirmed</p>
<h1 style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;color:#171717;">Your Vyhel purchase is ready.</h1>
<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;color:#3A3A37;">${hello}</p>
<p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:#3A3A37;">Thank you for buying <strong style="color:#171717;">${esc(p.productName)}</strong>. Your payment went through and your file is ready to download.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;"><tr><td style="border-radius:6px;background:#171717;">
<a href="${esc(p.downloadUrl)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Download your file</a>
</td></tr></table>
<p style="margin:0 0 24px 0;font-size:13px;line-height:20px;color:#6B6B66;">This private link works for ${p.maxDownloads} downloads until ${expires}. Please don't share it. If it expires, reply and we'll send a fresh one.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E9E6DF;padding-top:12px;">
${row("Product", esc(p.productName))}
${row("Amount paid", esc(p.amount))}
${row("Order", esc(p.orderId.slice(0, 8).toUpperCase()))}
${row("Date", esc(date))}
</table>`,
    footer: `${support}<br><br>You're receiving this because you bought a digital product on <a href="${esc(p.siteUrl)}" style="color:#6B6B66;">Vyhel</a>. Payments are processed securely by Razorpay.`,
  });
  const text = `Your Vyhel purchase is ready.

${hello.replace(/&#39;/g, "'")}

Thank you for buying ${p.productName}. Download your file here (private link, ${p.maxDownloads} downloads, valid until ${expires}):
${p.downloadUrl}

Product: ${p.productName}
Amount paid: ${p.amount}
Order: ${p.orderId.slice(0, 8).toUpperCase()}
Date: ${date}

${p.supportEmail ? `Support: ${p.supportEmail}` : "Questions? Just reply to this email."}
`;
  return { subject: `Your Vyhel purchase is ready: ${p.productName}`, html, text };
}

export function adminSaleEmail(p: {
  productName: string;
  customerEmail: string;
  amount: string;
  orderId: string;
  paymentId: string | null;
  paymentStatus: string;
  deliveryStatus: string;
  deliveryError: string | null;
  adminUrl: string;
}) {
  const rows = [
    ["Product", p.productName],
    ["Customer", p.customerEmail],
    ["Amount", p.amount],
    ["Order ID", p.orderId],
    ["Razorpay payment", p.paymentId ?? "—"],
    ["Payment status", p.paymentStatus],
    ["Delivery status", p.deliveryStatus + (p.deliveryError ? ` (${p.deliveryError})` : "")],
  ];
  const html = layout({
    preheader: `New sale: ${p.productName} — ${p.amount}`,
    body: `<h1 style="margin:0 0 18px 0;font-family:Georgia,serif;font-weight:400;font-size:26px;">New sale · ${esc(p.amount)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 0;font-size:13px;color:#6B6B66;">${esc(k)}</td><td style="padding:6px 0;font-size:13px;text-align:right;color:${k === "Delivery status" && p.deliveryStatus !== "sent" ? "#9B3B2E" : "#171717"};">${esc(v)}</td></tr>`,
      )
      .join("")}</table>
<p style="margin:24px 0 0 0;"><a href="${esc(p.adminUrl)}" style="color:#3F4E3D;font-size:14px;">Open the order in Vyhel admin →</a></p>`,
    footer: "Vyhel admin notification.",
  });
  const text = `New sale: ${p.amount}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${p.adminUrl}`;
  return { subject: `New Vyhel sale: ${p.productName} (${p.amount})`, html, text };
}
