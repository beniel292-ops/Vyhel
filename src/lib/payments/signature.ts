/**
 * Razorpay signature checks (pure Node crypto — no network, safe to unit test).
 *
 * - Checkout success: HMAC_SHA256(`${razorpay_order_id}|${razorpay_payment_id}`, KEY_SECRET) === razorpay_signature
 * - Webhooks:         HMAC_SHA256(rawRequestBody, WEBHOOK_SECRET) === X-Razorpay-Signature
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(a: string, b: string) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function hmacHex(secret: string, payload: string | Buffer) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}) {
  if (!input.keySecret || !input.orderId || !input.paymentId || !input.signature) return false;
  return safeEqualHex(hmacHex(input.keySecret, `${input.orderId}|${input.paymentId}`), input.signature);
}

export function verifyWebhookSignature(input: { rawBody: string | Buffer; signature: string | null; secret: string }) {
  if (!input.secret || !input.signature) return false;
  return safeEqualHex(hmacHex(input.secret, input.rawBody), input.signature);
}
