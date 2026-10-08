import "server-only";

/**
 * Small in-memory sliding-window limiter (per server instance). Keys are kept only in memory and
 * never stored. Good enough to blunt abuse of checkout/download endpoints; put a WAF/edge limit in
 * front for anything heavier.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((hits[0] + windowMs - now) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => t > now - windowMs)) buckets.delete(k);
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
