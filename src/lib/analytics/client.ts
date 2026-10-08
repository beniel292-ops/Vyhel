"use client";

/**
 * Privacy-first, first-party analytics.
 * - No cookies. A random session id lives in sessionStorage and vanishes when the tab closes.
 * - Attribution (source/campaign) is captured once per session from ?source= / utm_* or the referrer.
 * - Nothing identifies a person; the server never stores IPs or user agents.
 */
const ATTR_KEY = "vyhel_attr";

export type Attribution = { source: string; campaign: string | null; sessionId: string };

function classify(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === window.location.hostname) return "internal";
    const map: Array<[RegExp, string]> = [
      [/google\./, "google"],
      [/bing\.com$/, "bing"],
      [/duckduckgo\.com$/, "duckduckgo"],
      [/instagram\.com$/, "instagram"],
      [/youtube\.com$|youtu\.be$/, "youtube"],
      [/facebook\.com$/, "facebook"],
      [/(^|\.)t\.co$|twitter\.com$|(^|\.)x\.com$/, "x"],
      [/reddit\.com$/, "reddit"],
      [/linkedin\.com$|lnkd\.in$/, "linkedin"],
      [/whatsapp\.com$|wa\.me$/, "whatsapp"],
    ];
    for (const [re, name] of map) if (re.test(host)) return name;
    return "referral";
  } catch {
    return "direct";
  }
}

const clean = (v: string | null) => (v ? v.toLowerCase().replace(/[^a-z0-9_\-.]/g, "_").slice(0, 48) : null);

export function getAttribution(): Attribution {
  const fallback = { source: "direct", campaign: null, sessionId: "" };
  if (typeof window === "undefined") return fallback;
  try {
    const stored = sessionStorage.getItem(ATTR_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
    const params = new URLSearchParams(window.location.search);
    const source = clean(params.get("source") ?? params.get("utm_source")) ?? classify(document.referrer);
    const campaign = clean(params.get("campaign") ?? params.get("utm_campaign"));
    const sessionId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const attr = { source: source === "internal" ? "direct" : source, campaign, sessionId };
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return fallback;
  }
}

function send(url: string, payload: unknown) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
    void fetch(url, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    /* analytics must never break the page */
  }
}

export function trackEvent(
  eventType: string,
  data: { entityType?: string; entityId?: string; meta?: Record<string, string | number | boolean | null> } = {},
) {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return;
  const attr = getAttribution();
  send("/api/track/event", {
    eventType,
    path: window.location.pathname,
    source: attr.source,
    campaign: attr.campaign,
    sessionId: attr.sessionId,
    ...data,
  });
}

export function trackAffiliateClick(data: {
  productId: string;
  linkId?: string | null;
  placement: string;
  pageType: string;
  pageId?: string | null;
}) {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return;
  const attr = getAttribution();
  send("/api/track/click", {
    ...data,
    pagePath: window.location.pathname,
    source: attr.source,
    campaign: attr.campaign,
  });
}
