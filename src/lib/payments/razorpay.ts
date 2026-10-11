import "server-only";

/**
 * Minimal Razorpay REST client (no SDK needed).
 * Docs: Orders API, Payments API. Credentials come only from server env vars.
 * RAZORPAY_API_BASE exists solely so automated tests can point at a mock server.
 */
export type RazorpayConfig = { keyId: string; keySecret: string; webhookSecret: string | null; apiBase: string };

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null,
    apiBase: ((process.env.VERCEL_ENV === "production" ? "" : process.env.RAZORPAY_API_BASE?.trim()) || "https://api.razorpay.com").replace(/\/$/, ""),
  };
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function call<T>(cfg: RazorpayConfig, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${cfg.apiBase}/v1${path}`, {
    method,
    headers: {
      authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) throw new RazorpayError(data?.error?.description || `Razorpay request failed (${res.status})`, res.status);
  return data;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_description?: string | null;
};

export function createRazorpayOrder(
  cfg: RazorpayConfig,
  input: { amount: number; currency: string; receipt: string; notes: Record<string, string> },
) {
  return call<RazorpayOrder>(cfg, "POST", "/orders", {
    amount: input.amount,
    currency: input.currency,
    receipt: input.receipt.slice(0, 40),
    notes: input.notes,
  });
}

export function fetchPayment(cfg: RazorpayConfig, paymentId: string) {
  return call<RazorpayPayment>(cfg, "GET", `/payments/${encodeURIComponent(paymentId)}`);
}

export function capturePayment(cfg: RazorpayConfig, paymentId: string, amount: number, currency: string) {
  return call<RazorpayPayment>(cfg, "POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount, currency });
}

/** All payment attempts on a Razorpay order (used to reconcile an order whose browser session was closed). */
export function fetchOrderPayments(cfg: RazorpayConfig, orderId: string) {
  return call<{ items: RazorpayPayment[] }>(cfg, "GET", `/orders/${encodeURIComponent(orderId)}/payments`);
}
