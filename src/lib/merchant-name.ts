/** Display name for an affiliate merchant ("Amazon", "Flipkart", the link's own label, or the shop's domain). */
export function merchantDisplayName(merchant?: string | null, label?: string | null, href?: string | null) {
  if (merchant === "amazon" || !merchant) return label && !/^amazon/i.test(label) ? label : "Amazon";
  if (label) return label;
  if (merchant === "flipkart") return "Flipkart";
  return nameFromUrl(href) ?? "the retailer";
}

/** "https://www.croma.com/p/1" → "Croma" — so an unlabelled retailer still gets a specific CTA. */
function nameFromUrl(href?: string | null) {
  if (!href) return null;
  try {
    const host = new URL(href).hostname.replace(/^(www|shop|store|m)\./i, "");
    const name = host.split(".")[0];
    return name && /^[a-z0-9-]{2,30}$/i.test(name) ? name.charAt(0).toUpperCase() + name.slice(1) : null;
  } catch {
    return null;
  }
}
