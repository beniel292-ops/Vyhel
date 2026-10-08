export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
    ...opts,
  }).format(d);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

/** ~220 words per minute, minimum 1. */
export function estimateReadingTime(markdown: string) {
  const words = markdown.replace(/[#>*_`\-[\]()!]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function formatScore(score: number | null | undefined) {
  if (score === null || score === undefined) return null;
  return Number(score).toFixed(1);
}

export function linesToArray(value: FormDataEntryValue | null | undefined) {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Public base URL. NEXT_PUBLIC_SITE_URL (e.g. https://vyhel.co.in) wins; on Vercel without it,
 * fall back to the project's production domain instead of localhost; localhost only for local dev.
 */
export function siteBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  const base = siteBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function greeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(date),
  );
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  return "Good evening.";
}
