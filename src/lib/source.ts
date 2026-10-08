/** Classify where a visit came from, without storing anything that identifies the visitor. */
const KNOWN: Array<[RegExp, string]> = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)instagram\.com$|^l\.instagram\.com$/, "instagram"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/(^|\.)facebook\.com$|^l\.facebook\.com$/, "facebook"],
  [/(^|\.)t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, "x"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, "whatsapp"],
];

export function classifyReferrer(referrer: string | null | undefined, ownHost?: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (ownHost && host === ownHost) return "internal";
    for (const [re, name] of KNOWN) if (re.test(host)) return name;
    return "referral";
  } catch {
    return "direct";
  }
}

/** Normalise a free-form source/campaign token to a short safe string. */
export function cleanToken(value: unknown, max = 48): string | null {
  if (typeof value !== "string") return null;
  const v = value.toLowerCase().trim().replace(/[^a-z0-9_\-.]/g, "_").slice(0, max);
  return v || null;
}
