import { json } from "@/lib/http";
import { maskEmail } from "@/lib/money";
import { getPublicOrderStatus } from "@/server/services/digital-orders";

/** Public, minimal status for the confirmation page. No payment ids, no full email. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getPublicOrderStatus(id);
  if (!o) return json({ error: "Order not found" }, 404);
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
