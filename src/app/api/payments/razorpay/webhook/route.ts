import { eq } from "drizzle-orm";
import { after } from "next/server";
import { getDb, schema } from "@/db";
import { json } from "@/lib/http";
import { getRazorpayConfig } from "@/lib/payments/razorpay";
import { verifyWebhookSignature } from "@/lib/payments/signature";
import { confirmWebhookPayment, markPaymentFailed } from "@/server/services/digital-orders";

/**
 * Razorpay webhook (Dashboard → Webhooks). Subscribe to: payment.captured, order.paid, payment.failed.
 * - Verifies X-Razorpay-Signature against the RAW body with RAZORPAY_WEBHOOK_SECRET.
 * - De-duplicates by X-Razorpay-Event-Id, and order fulfilment itself is idempotent.
 * - Only touches digital_orders created by Vyhel's checkout (unknown orders are ignored).
 */
type PaymentEntity = { id: string; order_id: string; amount: number; currency: string; status: string; error_description?: string | null };

export async function POST(req: Request) {
  const cfg = getRazorpayConfig();
  if (!cfg?.webhookSecret) return json({ error: "Webhook not configured" }, 503);
  const raw = await req.text();
  if (!verifyWebhookSignature({ rawBody: raw, signature: req.headers.get("x-razorpay-signature"), secret: cfg.webhookSecret })) {
    return json({ error: "Invalid signature" }, 401);
  }
  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const type = event.event ?? "unknown";
  const payment = event.payload?.payment?.entity;
  const eventId = req.headers.get("x-razorpay-event-id");

  if (eventId) {
    const inserted = await getDb()
      .insert(schema.paymentEvents)
      .values({ eventId, eventType: type, razorpayOrderId: payment?.order_id ?? null, razorpayPaymentId: payment?.id ?? null })
      .onConflictDoNothing()
      .returning({ id: schema.paymentEvents.id });
    if (inserted.length === 0) return json({ ok: true, duplicate: true });
  }

  try {
    if ((type === "payment.captured" || type === "order.paid") && payment?.order_id) {
      const r = await confirmWebhookPayment(
        { razorpayOrderId: payment.order_id, paymentId: payment.id, amount: payment.amount, currency: payment.currency, status: payment.status },
        (task) => after(async () => {
          try {
            await task();
          } catch (err) {
            console.error("[webhook] delivery failed after response", err);
          }
        }),
      );
      return json({ ok: true, ...r });
    }
    if (type === "payment.failed" && payment?.order_id) {
      await markPaymentFailed(payment.order_id, payment.error_description ?? null);
      return json({ ok: true });
    }
    return json({ ok: true, ignored: type });
  } catch (err) {
    console.error("[webhook]", err);
    // Allow Razorpay to retry: forget the event id so the retry isn't treated as a duplicate.
    if (eventId) {
      await getDb().delete(schema.paymentEvents).where(eq(schema.paymentEvents.eventId, eventId)).catch(() => undefined);
    }
    return json({ error: "Processing failed" }, 500);
  }
}
