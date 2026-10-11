import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { emailConfig, redactEmails, sendEmail } from "@/lib/email/resend";
import { purchaseEmail } from "@/lib/email/templates";
import { EMAIL_RE, formatMoney } from "@/lib/money";
import { notifyAdminOfSale } from "@/lib/notify";
import {
  capturePayment,
  createRazorpayOrder,
  fetchOrderPayments,
  fetchPayment,
  getRazorpayConfig,
  RazorpayError,
} from "@/lib/payments/razorpay";
import { verifyPaymentSignature } from "@/lib/payments/signature";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";

/**
 * DIGITAL ORDERS service: checkout → payment confirmation → delivery → downloads.
 *
 * Guarantees
 * - The amount always comes from the database, never from the client.
 * - An order becomes "paid" only when Razorpay itself reports the payment as CAPTURED for this order,
 *   amount and currency — via its API (checkout verify, reconcile) or a signed webhook. A browser
 *   callback, redirect or "success" flag is never enough, and "authorized" is never enough.
 * - Delivery (email + download tokens) only happens through fulfilOrder(), which only runs for paid
 *   orders; the database also refuses download tokens for unpaid orders (migration 0005).
 * - "created/failed → paid" is a single atomic UPDATE, so concurrent or repeated confirmations
 *   (browser + webhook, webhook retries, page refreshes) fulfil an order exactly once.
 * - Email failure never undoes a payment: delivery has its own status and can be retried by an admin.
 */
const { digitalOrders, digitalProducts, digitalDownloadTokens } = schema;

export const DOWNLOAD_TTL_DAYS = 7;
export const DOWNLOAD_MAX = 10;
const CHECKOUT_TOKEN_TTL_HOURS = 24;
const CHECKOUT_TOKEN_MAX = 5;
const MAX_CHECKOUT_TOKENS_PER_ORDER = 5;

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status = 400,
    public field?: string,
  ) {
    super(message);
  }
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/* ------------------------------------------------------------- checkout */

export async function createCheckout(input: { productSlug: unknown; email: unknown; name?: unknown }) {
  const cfg = getRazorpayConfig();
  if (!cfg) throw new CheckoutError("Payments are not configured yet. Please try again later.", 503);

  const slug = typeof input.productSlug === "string" ? input.productSlug.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 254) : "";
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) || null : null;
  if (!EMAIL_RE.test(email)) throw new CheckoutError("Enter a valid email address — your download is sent there.", 400, "email");

  const db = getDb();
  const [product] = await db
    .select()
    .from(digitalProducts)
    .where(and(eq(digitalProducts.slug, slug), eq(digitalProducts.status, "active"), sql`${digitalProducts.fileId} is not null`))
    .limit(1);
  if (!product) throw new CheckoutError("This product isn't available right now.", 404);

  let rzpOrder;
  try {
    rzpOrder = await createRazorpayOrder(cfg, {
      amount: product.priceMinor, // ← server-side price, the only source of truth
      currency: product.currency,
      receipt: `vyhel_${Date.now().toString(36)}`,
      notes: { product_id: product.id, product: product.name.slice(0, 200), kind: "digital_product" },
    });
  } catch (err) {
    console.error("[checkout] Razorpay order failed", err instanceof RazorpayError ? err.message : err);
    throw new CheckoutError("We couldn't start the payment. Please try again in a moment.", 502);
  }
  if (rzpOrder.amount !== product.priceMinor || rzpOrder.currency !== product.currency) {
    throw new CheckoutError("Payment amount mismatch. Please try again.", 502);
  }

  const [order] = await db
    .insert(digitalOrders)
    .values({
      productId: product.id,
      productName: product.name,
      customerEmail: email,
      customerName: name,
      amountMinor: product.priceMinor,
      currency: product.currency,
      razorpayOrderId: rzpOrder.id,
    })
    .returning();

  const settings = await getSettings();
  return {
    orderId: order.id,
    razorpay: {
      key: cfg.keyId, // publishable key id — safe for the browser
      orderId: rzpOrder.id,
      amount: order.amountMinor,
      currency: order.currency,
      name: settings.siteName,
      description: (product.checkoutDescription || product.name).slice(0, 255),
      image: absoluteUrl("/icon.svg"),
      prefill: { email, name: name ?? "" },
    },
  };
}

/* ------------------------------------------------- payment confirmation */

type ConfirmSource = "checkout" | "webhook" | "reconcile";
type OrderRow = typeof digitalOrders.$inferSelect;

/** Is this Razorpay payment a CAPTURED payment for exactly this order, amount and currency (INR)? */
function capturedFor(p: { order_id: string; amount: number; currency: string; status: string }, order: OrderRow) {
  return p.order_id === order.razorpayOrderId && p.amount === order.amountMinor && p.currency === order.currency && p.currency === "INR" && p.status === "captured";
}

type CaptureCheck = { ok: true } | { ok: false; reason: "mismatch" | "not_captured" | "unreachable"; status?: string };

/**
 * Ask Razorpay's API (trusted, server-to-server) for the payment's real state. Captures an
 * "authorized" payment first (no-op when auto-capture is on). Only "captured" counts as paid.
 */
async function confirmCaptureWithRazorpay(cfg: NonNullable<ReturnType<typeof getRazorpayConfig>>, paymentId: string, order: OrderRow): Promise<CaptureCheck> {
  let p;
  try {
    p = await fetchPayment(cfg, paymentId);
  } catch (err) {
    console.warn("[checkout] could not fetch payment from Razorpay", err instanceof Error ? err.message : err);
    return { ok: false, reason: "unreachable" };
  }
  if (p.order_id !== order.razorpayOrderId || p.amount !== order.amountMinor || p.currency !== order.currency || p.currency !== "INR") {
    return { ok: false, reason: "mismatch", status: p.status };
  }
  if (p.status === "authorized") {
    try {
      p = await capturePayment(cfg, paymentId, order.amountMinor, order.currency);
    } catch (err) {
      // e.g. "already captured" by auto-capture in the meantime — re-read the truth instead of guessing.
      console.warn("[checkout] capture call failed, re-checking", err instanceof Error ? err.message : err);
      try {
        p = await fetchPayment(cfg, paymentId);
      } catch {
        return { ok: false, reason: "unreachable" };
      }
    }
  }
  return capturedFor(p, order) ? { ok: true } : { ok: false, reason: "not_captured", status: p.status };
}

/**
 * Atomically mark an order paid. Returns `transitioned: true` only for the single call that
 * actually flipped it — that call (and only that call) performs fulfilment.
 */
async function markPaid(razorpayOrderId: string, paymentId: string, source: ConfirmSource, signature?: string) {
  const db = getDb();
  const [updated] = await db
    .update(digitalOrders)
    .set({
      paymentStatus: "paid",
      razorpayPaymentId: paymentId,
      razorpaySignature: signature ?? null,
      paymentSource: source,
      failureReason: null,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(digitalOrders.razorpayOrderId, razorpayOrderId), inArray(digitalOrders.paymentStatus, ["created", "failed"])))
    .returning();
  if (updated) return { order: updated, transitioned: true };
  const [existing] = await db.select().from(digitalOrders).where(eq(digitalOrders.razorpayOrderId, razorpayOrderId));
  return { order: existing ?? null, transitioned: false };
}

/** Called by the browser after Razorpay Checkout's success handler. Never trusts the client: the signature is verified here. */
export async function confirmCheckoutPayment(input: { razorpayOrderId: unknown; razorpayPaymentId: unknown; razorpaySignature: unknown }) {
  const cfg = getRazorpayConfig();
  if (!cfg) throw new CheckoutError("Payments are not configured.", 503);
  const orderId = String(input.razorpayOrderId ?? "");
  const paymentId = String(input.razorpayPaymentId ?? "");
  const signature = String(input.razorpaySignature ?? "");
  if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId)) throw new CheckoutError("Invalid payment reference.");
  if (!verifyPaymentSignature({ orderId, paymentId, signature, keySecret: cfg.keySecret })) {
    throw new CheckoutError("We couldn't verify this payment. If money was debited, it will be confirmed shortly or refunded.", 400);
  }

  // The signature only proves the browser's message came from Razorpay. Before fulfilling, ask
  // Razorpay's API whether the money was actually CAPTURED for this order, amount and currency.
  const db = getDb();
  const [pending] = await db.select().from(digitalOrders).where(eq(digitalOrders.razorpayOrderId, orderId));
  if (!pending) throw new CheckoutError("Order not found.", 404);
  const alreadyPaidByThis = pending.paymentStatus === "paid" && pending.razorpayPaymentId === paymentId;
  if (!alreadyPaidByThis) {
    const check = await confirmCaptureWithRazorpay(cfg, paymentId, pending);
    if (!check.ok) {
      if (check.reason === "mismatch") throw new CheckoutError("Payment details don't match this order.", 400);
      if (check.reason === "not_captured" && (check.status === "failed" || check.status === "refunded")) {
        throw new CheckoutError("This payment was not completed. You have not been charged for this order.", 400);
      }
      // Not captured yet (or Razorpay unreachable): nothing is delivered now. The signed webhook or
      // the confirmation page's reconcile check fulfils the order once Razorpay reports it captured.
      throw new CheckoutError("We're still confirming your payment with Razorpay.", 202);
    }
  }

  const { order, transitioned } = await markPaid(orderId, paymentId, "checkout", signature);
  if (!order) throw new CheckoutError("Order not found.", 404);
  if (order.paymentStatus !== "paid") throw new CheckoutError("This order isn't paid.", 409);
  if (order.razorpayPaymentId !== paymentId) {
    // A second, different payment for an already-paid order: never deliver twice, flag for refund.
    console.error(`[checkout] duplicate payment ${paymentId} for already-paid order ${order.id}`);
    throw new CheckoutError("This order was already paid with a different payment. Please contact support for a refund of the duplicate.", 409);
  }
  if (transitioned) await fulfilOrder(order.id, { notifyAdmin: true });

  // Give the paying browser its own short-lived download token (doesn't touch the emailed link).
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(digitalDownloadTokens)
    .where(and(eq(digitalDownloadTokens.orderId, order.id), eq(digitalDownloadTokens.reason, "checkout")));
  const downloadToken =
    n < MAX_CHECKOUT_TOKENS_PER_ORDER
      ? await issueDownloadToken(order.id, "checkout", { ttlHours: CHECKOUT_TOKEN_TTL_HOURS, max: CHECKOUT_TOKEN_MAX })
      : null;
  return { orderId: order.id, downloadToken };
}

/** Webhook path: signature already verified by the route; payload values are trusted. */
export async function confirmWebhookPayment(
  p: { razorpayOrderId: string; paymentId: string; amount: number; currency: string; status: string },
  /** Razorpay expects a 2xx within 5 seconds, so the route defers email delivery until after responding. */
  defer: (task: () => Promise<unknown>) => void = (task) => void task(),
) {
  const db = getDb();
  const [existing] = await db.select().from(digitalOrders).where(eq(digitalOrders.razorpayOrderId, p.razorpayOrderId));
  if (!existing) return { handled: false as const, reason: "unknown order" };
  if (existing.amountMinor !== p.amount || existing.currency !== p.currency || p.currency !== "INR") {
    console.error(`[webhook] amount/currency mismatch for ${existing.id}`);
    return { handled: false as const, reason: "amount mismatch" };
  }
  if (p.status !== "captured") {
    // e.g. an "authorized" payment: never deliver until Razorpay reports it captured.
    return { handled: false as const, reason: `payment ${p.status || "unknown"}, not captured` };
  }
  const { order, transitioned } = await markPaid(p.razorpayOrderId, p.paymentId, "webhook");
  if (!order) return { handled: false as const, reason: "unknown order" };
  if (transitioned) defer(() => fulfilOrder(order.id, { notifyAdmin: true }));
  else if (order.paymentStatus === "paid" && order.deliveryStatus === "pending") {
    // Paid earlier but delivery never ran (e.g. the process died mid-request) — retry once claimed.
    defer(() => fulfilOrder(order.id, { notifyAdmin: false }));
  }
  return { handled: true as const, transitioned };
}

const lastReconcile = new Map<string, number>();

/**
 * Reconcile an unpaid order against Razorpay (server-to-server). Used when the customer's browser
 * closed before the checkout handler ran — e.g. a UPI payment approved after the window was
 * dismissed — and as a backstop if a webhook is late. Throttled per order. Never trusts the client.
 */
export async function reconcileOrder(orderId: string, defer: (task: () => Promise<unknown>) => void = (t) => void t()) {
  const cfg = getRazorpayConfig();
  if (!cfg) return { reconciled: false as const };
  const db = getDb();
  const [order] = await db.select().from(digitalOrders).where(eq(digitalOrders.id, orderId));
  if (!order?.razorpayOrderId || order.paymentStatus === "paid" || order.paymentStatus === "refunded") return { reconciled: false as const };
  const now = Date.now();
  if (now - (lastReconcile.get(orderId) ?? 0) < 10_000) return { reconciled: false as const };
  lastReconcile.set(orderId, now);
  if (lastReconcile.size > 5000) lastReconcile.clear();
  let items;
  try {
    items = (await fetchOrderPayments(cfg, order.razorpayOrderId)).items ?? [];
  } catch (err) {
    console.warn("[reconcile] Razorpay unreachable", err instanceof Error ? err.message : err);
    return { reconciled: false as const };
  }
  const captured = items.find((p) => capturedFor(p, order));
  if (!captured) return { reconciled: false as const };
  const { order: paid, transitioned } = await markPaid(order.razorpayOrderId, captured.id, "reconcile");
  if (transitioned && paid) defer(() => fulfilOrder(paid.id, { notifyAdmin: true }));
  return { reconciled: transitioned };
}

export async function markPaymentFailed(razorpayOrderId: string, reason: string | null) {
  await getDb()
    .update(digitalOrders)
    .set({ paymentStatus: "failed", failureReason: reason?.slice(0, 300) ?? "Payment failed", updatedAt: new Date() })
    .where(and(eq(digitalOrders.razorpayOrderId, razorpayOrderId), eq(digitalOrders.paymentStatus, "created")));
}

/* ------------------------------------------------------------- delivery */

export async function issueDownloadToken(orderId: string, reason: string, opts: { ttlHours?: number; max?: number } = {}) {
  const token = randomBytes(32).toString("base64url"); // 256 bits — unguessable
  const ttlHours = opts.ttlHours ?? DOWNLOAD_TTL_DAYS * 24;
  await getDb()
    .insert(digitalDownloadTokens)
    .values({
      orderId,
      tokenHash: hash(token),
      reason,
      expiresAt: new Date(Date.now() + ttlHours * 3600_000),
      maxDownloads: opts.max ?? DOWNLOAD_MAX,
    });
  return token;
}

/** An attempt younger than this is treated as still in flight (blocks concurrent sends). */
const DELIVERY_IN_FLIGHT_MS = 120_000;
/** Tokens that were emailed to the customer (the success-page "checkout" token is separate). */
const EMAILED_TOKEN_REASONS = ["email", "resend"];

/** Best-effort audit row per customer-delivery attempt; never breaks delivery if it can't be written. */
async function recordDeliveryAttempt(row: { orderId: string; attempt: number; trigger: string; ok: boolean; messageId: string | null; error: string | null }) {
  try {
    await getDb().insert(schema.digitalDeliveryAttempts).values({
      orderId: row.orderId,
      attempt: row.attempt,
      trigger: row.trigger,
      providerMessageId: row.messageId,
      status: row.ok ? "accepted" : "failed",
      error: row.error,
    });
  } catch (err) {
    console.warn("[delivery] could not record attempt", err instanceof Error ? err.message : err);
  }
}

/**
 * Sends (or re-sends) the CUSTOMER download email to the address stored on the order.
 * - Only for paid orders, and never while another attempt for the same order is in flight
 *   (the claim below is a single conditional UPDATE, so concurrent callers can't both send).
 * - `force` (admin resend) may re-send an already-sent order; automatic paths never do.
 * - "sent" means Resend accepted the message and returned its id; a later bounce is reconciled by the
 *   Resend webhook. Payment state is never changed here.
 * - At most one emailed link stays active: a failed attempt's token is revoked immediately, and a
 *   successful one revokes the previously emailed links.
 */
export async function fulfilOrder(orderId: string, opts: { notifyAdmin: boolean; force?: boolean; reason?: string }) {
  const db = getDb();
  const stale = new Date(Date.now() - DELIVERY_IN_FLIGHT_MS);
  const claimWhere = opts.force
    ? and(
        eq(digitalOrders.id, orderId),
        eq(digitalOrders.paymentStatus, "paid"),
        or(sql`${digitalOrders.deliveryStatus} <> 'pending'`, isNull(digitalOrders.lastDeliveryAt), lt(digitalOrders.lastDeliveryAt, stale)),
      )
    : and(
        eq(digitalOrders.id, orderId),
        eq(digitalOrders.paymentStatus, "paid"),
        sql`${digitalOrders.deliveryStatus} <> 'sent'`,
        or(isNull(digitalOrders.lastDeliveryAt), lt(digitalOrders.lastDeliveryAt, stale)),
      );
  const [order] = await db
    .update(digitalOrders)
    .set({ deliveryStatus: "pending", deliveryAttempts: sql`${digitalOrders.deliveryAttempts} + 1`, lastDeliveryAt: new Date(), updatedAt: new Date() })
    .where(claimWhere)
    .returning();
  if (!order || order.paymentStatus !== "paid") {
    return { sent: false, skipped: true as const, error: "Another delivery attempt for this order is in progress. Try again in a couple of minutes.", messageId: null };
  }

  const trigger = opts.reason ?? "email";
  let result: Awaited<ReturnType<typeof sendEmail>>;
  let token: string | null = null;
  try {
    const settings = await getSettings();
    token = await issueDownloadToken(order.id, trigger);
    const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_DAYS * 86400_000);
    const mail = purchaseEmail({
      customerName: order.customerName,
      productName: order.productName,
      orderId: order.id,
      amount: formatMoney(order.amountMinor, order.currency),
      paidAt: order.paidAt ?? new Date(),
      downloadUrl: absoluteUrl(`/download/${token}`),
      expiresAt,
      maxDownloads: DOWNLOAD_MAX,
      supportEmail: settings.contactEmail || emailConfig().adminEmail,
      siteUrl: absoluteUrl("/"),
    });
    result = await sendEmail({
      // Always the address persisted on the order — never the admin address.
      to: order.customerEmail,
      ...mail,
      replyTo: settings.contactEmail || emailConfig().adminEmail,
      idempotencyKey: `delivery-${order.id}-${order.deliveryAttempts}`,
      tags: [{ name: "type", value: "digital_delivery" }],
    });
  } catch (err) {
    result = { ok: false, error: redactEmails(err instanceof Error ? err.message : "Delivery failed") };
  }

  if (token) {
    const keep = hash(token);
    if (result.ok) {
      await db
        .update(digitalDownloadTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(digitalDownloadTokens.orderId, order.id), inArray(digitalDownloadTokens.reason, EMAILED_TOKEN_REASONS), isNull(digitalDownloadTokens.revokedAt), sql`${digitalDownloadTokens.tokenHash} <> ${keep}`));
    } else {
      // The customer never received this link — it must not stay usable.
      await db.update(digitalDownloadTokens).set({ revokedAt: new Date() }).where(eq(digitalDownloadTokens.tokenHash, keep));
    }
  }

  const [after] = await db
    .update(digitalOrders)
    .set({
      deliveryStatus: result.ok ? "sent" : "failed",
      lastDeliveryError: result.ok ? null : result.error.slice(0, 300),
      updatedAt: new Date(),
    })
    .where(eq(digitalOrders.id, order.id))
    .returning();
  await recordDeliveryAttempt({
    orderId: order.id,
    attempt: order.deliveryAttempts,
    trigger,
    ok: result.ok,
    messageId: result.ok ? result.id : null,
    error: result.ok ? null : result.error.slice(0, 300),
  });
  if (!result.ok) console.error(`[delivery] customer email failed for order ${order.id}: ${result.error}`);

  if (opts.notifyAdmin) {
    // Separate email to ADMIN_EMAIL; its success says nothing about the customer email above.
    await notifyAdminOfSale({
      productName: after.productName,
      customerEmail: after.customerEmail,
      amount: formatMoney(after.amountMinor, after.currency),
      orderId: after.id,
      paymentId: after.razorpayPaymentId,
      paymentStatus: after.paymentStatus,
      deliveryStatus: after.deliveryStatus,
      deliveryError: after.lastDeliveryError,
      adminUrl: absoluteUrl(`/admin/orders/${after.id}`),
    });
  }
  return { sent: result.ok, skipped: false as const, error: result.ok ? null : result.error, messageId: result.ok ? result.id : null };
}

/**
 * Admin action: re-send the download email for an existing order, optionally to a corrected address.
 * Never creates an order or a payment. Before sending, Razorpay must confirm (again) that this order's
 * payment is captured for the right order, amount and currency — a refunded or disputed payment is refused.
 */
export async function resendDelivery(user: SessionUser, orderId: string, newEmail?: string | null) {
  const db = getDb();
  const [order] = await db.select().from(digitalOrders).where(eq(digitalOrders.id, orderId));
  if (!order) throw new CheckoutError("Order not found.", 404);
  if (order.paymentStatus !== "paid" || !order.razorpayPaymentId) throw new CheckoutError("Only paid orders can be delivered.", 409);
  const cfg = getRazorpayConfig();
  if (!cfg) throw new CheckoutError("Razorpay isn't configured, so the payment can't be re-confirmed before sending.", 503);
  let payment: Awaited<ReturnType<typeof fetchPayment>>;
  try {
    payment = await fetchPayment(cfg, order.razorpayPaymentId);
  } catch {
    throw new CheckoutError("Couldn't reach Razorpay to re-confirm this payment. Nothing was sent — try again shortly.", 502);
  }
  if (!capturedFor(payment, order)) {
    throw new CheckoutError(`Razorpay reports this payment as "${payment.status}" (or it doesn't match this order), so the download can't be sent.`, 409);
  }

  const email = newEmail?.trim().toLowerCase();
  if (email && email !== order.customerEmail) {
    if (!EMAIL_RE.test(email)) throw new CheckoutError("Enter a valid email address.", 400, "email");
    await db.update(digitalOrders).set({ customerEmail: email, updatedAt: new Date() }).where(eq(digitalOrders.id, orderId));
    // Links sent to the wrong address stop working.
    await db
      .update(digitalDownloadTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(digitalDownloadTokens.orderId, orderId), isNull(digitalDownloadTokens.revokedAt)));
    await audit(user, "digital_order", orderId, "change_email", `${order.customerEmail} → ${email}`);
  }
  const r = await fulfilOrder(orderId, { notifyAdmin: false, force: true, reason: "resend" });
  await audit(
    user,
    "digital_order",
    orderId,
    r.sent ? "resend_delivery" : "resend_delivery_failed",
    r.sent ? `resend message ${r.messageId}` : (r.error ?? undefined),
  );
  return r;
}

/** Resend event → attempt status. Final states are never overwritten by earlier-stage events (events can arrive out of order). */
const EMAIL_EVENT_STATUS: Record<string, { status: string; rank: number; failsDelivery?: boolean }> = {
  "email.delivery_delayed": { status: "delayed", rank: 1 },
  "email.delivered": { status: "delivered", rank: 2 },
  "email.complained": { status: "complained", rank: 3 },
  "email.bounced": { status: "bounced", rank: 3, failsDelivery: true },
  "email.failed": { status: "failed", rank: 3, failsDelivery: true },
};
const STATUS_RANK: Record<string, number> = { accepted: 0, delayed: 1, delivered: 2, complained: 3, bounced: 3, failed: 3 };

/** Applies a verified Resend webhook event to the matching customer-delivery attempt. Idempotent. */
export async function applyEmailEvent(messageId: string, type: string) {
  const mapped = EMAIL_EVENT_STATUS[type];
  if (!mapped) return { handled: false as const, reason: "event not tracked" };
  const db = getDb();
  const { digitalDeliveryAttempts } = schema;
  const [attempt] = await db.select().from(digitalDeliveryAttempts).where(eq(digitalDeliveryAttempts.providerMessageId, messageId));
  if (!attempt) return { handled: false as const, reason: "not a customer delivery email" };
  if ((STATUS_RANK[attempt.status] ?? 0) >= mapped.rank && attempt.status !== "accepted") {
    return { handled: true as const, changed: false };
  }
  await db
    .update(digitalDeliveryAttempts)
    .set({ status: mapped.status, error: mapped.failsDelivery ? `Resend reported ${type}` : attempt.error, updatedAt: new Date() })
    .where(eq(digitalDeliveryAttempts.id, attempt.id));
  if (mapped.failsDelivery) {
    // Only the latest attempt decides the order's delivery state; a newer successful resend wins.
    const [latest] = await db
      .select({ id: digitalDeliveryAttempts.id })
      .from(digitalDeliveryAttempts)
      .where(eq(digitalDeliveryAttempts.orderId, attempt.orderId))
      .orderBy(desc(digitalDeliveryAttempts.attempt), desc(digitalDeliveryAttempts.createdAt))
      .limit(1);
    if (latest?.id === attempt.id) {
      await db
        .update(digitalOrders)
        .set({
          deliveryStatus: "failed",
          lastDeliveryError: type === "email.bounced" ? "The customer's mail server rejected the email (bounced). Check the address, then resend." : "Resend could not deliver the email. Check the address, then resend.",
          updatedAt: new Date(),
        })
        .where(and(eq(digitalOrders.id, attempt.orderId), eq(digitalOrders.deliveryStatus, "sent")));
    }
  }
  return { handled: true as const, changed: true };
}

/* ------------------------------------------------------------ downloads */

export type DownloadCheck =
  | { ok: true; order: typeof digitalOrders.$inferSelect; tokenId: string; fileId: string; remaining: number; expiresAt: Date }
  | { ok: false; reason: "invalid" | "expired" | "exhausted" | "revoked" | "unpaid" | "unavailable" };

/** Validate a token. With `consume`, atomically counts one download (fails if the limit was reached). */
export async function checkDownloadToken(rawToken: string, opts: { consume: boolean }): Promise<DownloadCheck> {
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(rawToken)) return { ok: false, reason: "invalid" };
  const db = getDb();
  const [row] = await db
    .select({ token: digitalDownloadTokens, order: digitalOrders, fileId: digitalProducts.fileId })
    .from(digitalDownloadTokens)
    .innerJoin(digitalOrders, eq(digitalOrders.id, digitalDownloadTokens.orderId))
    .innerJoin(digitalProducts, eq(digitalProducts.id, digitalOrders.productId))
    .where(eq(digitalDownloadTokens.tokenHash, hash(rawToken)));
  if (!row) return { ok: false, reason: "invalid" };
  if (row.token.revokedAt) return { ok: false, reason: "revoked" };
  if (row.order.paymentStatus !== "paid") return { ok: false, reason: "unpaid" };
  if (row.token.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.token.downloadCount >= row.token.maxDownloads) return { ok: false, reason: "exhausted" };
  if (!row.fileId) return { ok: false, reason: "unavailable" };
  let count = row.token.downloadCount;
  if (opts.consume) {
    const [used] = await db
      .update(digitalDownloadTokens)
      .set({ downloadCount: sql`${digitalDownloadTokens.downloadCount} + 1`, lastUsedAt: new Date() })
      .where(
        and(
          eq(digitalDownloadTokens.id, row.token.id),
          isNull(digitalDownloadTokens.revokedAt),
          gt(digitalDownloadTokens.expiresAt, new Date()),
          lt(digitalDownloadTokens.downloadCount, digitalDownloadTokens.maxDownloads),
        ),
      )
      .returning({ downloadCount: digitalDownloadTokens.downloadCount });
    if (!used) return { ok: false, reason: "exhausted" };
    count = used.downloadCount;
  }
  return {
    ok: true,
    order: row.order,
    tokenId: row.token.id,
    fileId: row.fileId,
    remaining: row.token.maxDownloads - count,
    expiresAt: row.token.expiresAt,
  };
}

/* --------------------------------------------------------------- status */

/** Public, minimal order status for the confirmation page (order ids are random UUIDs). */
export async function getPublicOrderStatus(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const [o] = await getDb()
    .select({
      id: digitalOrders.id,
      productName: digitalOrders.productName,
      customerEmail: digitalOrders.customerEmail,
      amountMinor: digitalOrders.amountMinor,
      currency: digitalOrders.currency,
      paymentStatus: digitalOrders.paymentStatus,
      deliveryStatus: digitalOrders.deliveryStatus,
      paidAt: digitalOrders.paidAt,
    })
    .from(digitalOrders)
    .where(eq(digitalOrders.id, orderId));
  return o ?? null;
}

/* ---------------------------------------------------------------- admin */

export async function adminListOrders(f: { q?: string; payment?: string; delivery?: string; page: number }) {
  const where: SQL[] = [];
  if (f.q) {
    const q = f.q.trim();
    where.push(
      or(
        ilike(digitalOrders.customerEmail, `%${q}%`),
        ilike(digitalOrders.productName, `%${q}%`),
        ilike(digitalOrders.razorpayOrderId, `%${q}%`),
        ilike(digitalOrders.razorpayPaymentId, `%${q}%`),
        sql`${digitalOrders.id}::text ilike ${`${q}%`}`,
      )!,
    );
  }
  if (f.payment && schema.paymentStatus.enumValues.includes(f.payment as never)) where.push(eq(digitalOrders.paymentStatus, f.payment as never));
  if (f.delivery && schema.deliveryStatus.enumValues.includes(f.delivery as never)) where.push(eq(digitalOrders.deliveryStatus, f.delivery as never));
  const size = 30;
  const db = getDb();
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(digitalOrders).where(and(...where)).orderBy(desc(digitalOrders.createdAt)).limit(size).offset((f.page - 1) * size),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(digitalOrders).where(and(...where)),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / size)) };
}

export async function adminGetOrder(id: string) {
  const db = getDb();
  const [order] = await db.select().from(digitalOrders).where(eq(digitalOrders.id, id));
  if (!order) return null;
  const tokens = await db
    .select({
      id: digitalDownloadTokens.id,
      reason: digitalDownloadTokens.reason,
      expiresAt: digitalDownloadTokens.expiresAt,
      maxDownloads: digitalDownloadTokens.maxDownloads,
      downloadCount: digitalDownloadTokens.downloadCount,
      revokedAt: digitalDownloadTokens.revokedAt,
      lastUsedAt: digitalDownloadTokens.lastUsedAt,
      createdAt: digitalDownloadTokens.createdAt,
    })
    .from(digitalDownloadTokens)
    .where(eq(digitalDownloadTokens.orderId, id))
    .orderBy(desc(digitalDownloadTokens.createdAt));
  // Tolerates the table not existing yet (code deployed before the migration ran).
  const attempts = await db
    .select()
    .from(schema.digitalDeliveryAttempts)
    .where(eq(schema.digitalDeliveryAttempts.orderId, id))
    .orderBy(desc(schema.digitalDeliveryAttempts.createdAt))
    .catch(() => null);
  return { order, tokens, attempts };
}

export async function digitalSalesSummary(days = 30) {
  const since = new Date(Date.now() - days * 86400_000);
  const [r] = await getDb()
    .select({
      orders: sql<number>`count(*) filter (where ${digitalOrders.paymentStatus} = 'paid' and ${digitalOrders.paidAt} >= ${since.toISOString()})`.mapWith(Number),
      revenueMinor: sql<number>`coalesce(sum(${digitalOrders.amountMinor}) filter (where ${digitalOrders.paymentStatus} = 'paid' and ${digitalOrders.paidAt} >= ${since.toISOString()}), 0)`.mapWith(Number),
      allOrders: sql<number>`count(*) filter (where ${digitalOrders.paymentStatus} = 'paid')`.mapWith(Number),
      deliveryIssues: sql<number>`count(*) filter (where ${digitalOrders.paymentStatus} = 'paid' and ${digitalOrders.deliveryStatus} <> 'sent')`.mapWith(Number),
    })
    .from(digitalOrders);
  return r;
}
