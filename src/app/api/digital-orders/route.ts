import { isResponse, requireApiUser } from "@/lib/auth/api";
import { badRequest, json, readJson } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { adminListOrders, CheckoutError, createCheckout } from "@/server/services/digital-orders";

/**
 * DIGITAL ORDERS
 * POST /api/digital-orders → start checkout for a digital product: { productSlug, email, name? }
 *   The price is read from the database; the client never sends an amount.
 * GET  /api/digital-orders → admin list (auth)
 */
export async function POST(req: Request) {
  const limit = rateLimit(`checkout:${clientKey(req)}`, 10, 60_000);
  if (!limit.ok) return json({ error: "Too many attempts. Please wait a minute." }, 429, { "retry-after": String(limit.retryAfter) });
  const body = await readJson(req, 4_000);
  if (!body) return badRequest("Invalid request.");
  try {
    return json(await createCheckout({ productSlug: body.productSlug, email: body.email, name: body.name }), 201);
  } catch (err) {
    if (err instanceof CheckoutError) return json({ error: err.message, field: err.field }, err.status);
    console.error("[digital-orders] checkout failed", err);
    return json({ error: "Something went wrong starting checkout." }, 500);
  }
}

export async function GET(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const u = new URL(req.url);
  const data = await adminListOrders({
    q: u.searchParams.get("q") ?? undefined,
    payment: u.searchParams.get("payment") ?? undefined,
    delivery: u.searchParams.get("delivery") ?? undefined,
    page: Math.max(1, Number(u.searchParams.get("page")) || 1),
  });
  return json({ ...data, rows: data.rows.map(({ razorpaySignature: _s, ...r }) => (void _s, r)) });
}
