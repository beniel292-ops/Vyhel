import { badRequest, json, readJson } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { CheckoutError, confirmCheckoutPayment } from "@/server/services/digital-orders";

/**
 * Called by the browser with Razorpay Checkout's handler response.
 * The signature is verified server-side; nothing the client says about "success" is trusted.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`verify:${clientKey(req)}`, 20, 60_000);
  if (!limit.ok) return json({ error: "Too many attempts." }, 429);
  const body = await readJson(req, 2_000);
  if (!body) return badRequest("Invalid request.");
  try {
    const r = await confirmCheckoutPayment({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
    });
    return json({ ok: true, orderId: r.orderId, downloadToken: r.downloadToken });
  } catch (err) {
    if (err instanceof CheckoutError) return json({ ok: false, error: err.message }, err.status);
    console.error("[verify]", err);
    return json({ ok: false, error: "We couldn't confirm the payment yet. If you were charged, you'll get an email shortly." }, 500);
  }
}
