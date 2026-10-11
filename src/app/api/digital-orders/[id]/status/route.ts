import { after } from "next/server";
import { json } from "@/lib/http";
import { maskEmail } from "@/lib/money";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getPublicOrderStatus, reconcileOrder } from "@/server/services/digital-orders";

/**
 * Public, minimal status for the confirmation page and the checkout box. No payment ids, no full email.
 * While an order is unpaid, this also asks Razorpay (server-side, throttled) whether a payment was
 * CAPTURED for it — e.g. a UPI payment approved after the checkout window was closed. Nothing the
 * browser sends can mark an order paid.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let o = await getPublicOrderStatus(id);
  if (!o) return json({ error: "Order not found" }, 404);
  if (o.paymentStatus !== "paid" && o.paymentStatus !== "refunded" && rateLimit(`status:${clientKey(req)}`, 40, 60_000).ok) {
    const r = await reconcileOrder(o.id, (task) =>
      after(async () => {
        try {
          await task();
        } catch (err) {
          console.error("[status] delivery after reconcile failed", err);
        }
      }),
    ).catch((err) => {
      console.error("[status] reconcile failed", err);
      return { reconciled: false as const };
    });
    if (r.reconciled) o = (await getPublicOrderStatus(id)) ?? o;
  }
  return json({
    id: o.id,
    productName: o.productName,
    email: maskEmail(o.customerEmail),
    amountMinor: o.amountMinor,
    currency: o.currency,
    paymentStatus: o.paymentStatus,
    deliveryStatus: o.deliveryStatus,
  });
}
