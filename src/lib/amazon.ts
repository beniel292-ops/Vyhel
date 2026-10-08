/**
 * Amazon Associates helpers.
 *
 * Vyhel never generates or rewrites affiliate links. Admins paste the exact Special Link
 * produced by Amazon (SiteStripe or Associates Central). These helpers only *inspect* a link
 * so the admin gets useful warnings before publishing.
 */
const AMAZON_HOSTS = [
  /(^|\.)amazon\.(in|com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp|ae|sa|sg|nl|se|pl|com\.br|com\.mx|com\.tr)$/i,
  /^amzn\.to$/i, // Amazon's own SiteStripe short link
  /^amzn\.eu$/i,
];

export type LinkInspection = {
  ok: boolean;
  isAmazon: boolean;
  isShortLink: boolean;
  tag: string | null;
  asin: string | null;
  warnings: string[];
  errors: string[];
};

export function inspectAffiliateLink(raw: string, expectedTag?: string | null): LinkInspection {
  const result: LinkInspection = {
    ok: false,
    isAmazon: false,
    isShortLink: false,
    tag: null,
    asin: null,
    warnings: [],
    errors: [],
  };
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    result.errors.push("This doesn't look like a valid URL.");
    return result;
  }
  if (url.protocol !== "https:") result.errors.push("Links must use https://");

  result.isAmazon = AMAZON_HOSTS.some((re) => re.test(url.hostname));
  result.isShortLink = /^amzn\.(to|eu)$/i.test(url.hostname);
  result.tag = url.searchParams.get("tag");
  result.asin = extractAsin(url.toString());

  if (!result.isAmazon) {
    result.warnings.push("Not an Amazon domain. That's fine for other merchants, but Amazon CTAs should point to Amazon.");
  } else if (!result.isShortLink && !result.tag) {
    result.warnings.push("No ?tag= found. Copy the Special Link from SiteStripe/Associates Central so the click is attributed.");
  }
  if (expectedTag && result.tag && result.tag !== expectedTag) {
    result.warnings.push(`Tag "${result.tag}" differs from the Associate ID in settings ("${expectedTag}").`);
  }
  result.ok = result.errors.length === 0;
  return result;
}

export function extractAsin(url: string): string | null {
  const m = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1].toUpperCase() : null;
}
