import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyPaymentSignature, verifyWebhookSignature } from "../src/lib/payments/signature";

const secret = "test_secret_123";
const sign = (payload: string, key = secret) => createHmac("sha256", key).update(payload).digest("hex");

test("accepts a valid checkout signature", () => {
  const signature = sign("order_ABC|pay_XYZ");
  assert.equal(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature, keySecret: secret }), true);
});

test("rejects a signature for a different payment, order or secret", () => {
  const signature = sign("order_ABC|pay_XYZ");
  assert.equal(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_OTHER", signature, keySecret: secret }), false);
  assert.equal(verifyPaymentSignature({ orderId: "order_OTHER", paymentId: "pay_XYZ", signature, keySecret: secret }), false);
  assert.equal(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature, keySecret: "wrong" }), false);
});

test("rejects malformed and empty signatures without throwing", () => {
  for (const signature of ["", "zz", "not-hex", sign("x").slice(0, 10)]) {
    assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_B", signature, keySecret: secret }), false);
  }
  assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_B", signature: sign("order_A|pay_B"), keySecret: "" }), false);
});

test("webhook signature is computed over the exact raw body", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });
  assert.equal(verifyWebhookSignature({ rawBody: body, signature: sign(body), secret }), true);
  assert.equal(verifyWebhookSignature({ rawBody: body + " ", signature: sign(body), secret }), false);
  assert.equal(verifyWebhookSignature({ rawBody: body, signature: null, secret }), false);
  assert.equal(verifyWebhookSignature({ rawBody: body, signature: sign(body), secret: "" }), false);
});
