import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { describeResendError, redactEmails, senderDomain } from "../src/lib/email/errors";
import { verifyResendWebhook } from "../src/lib/email/webhook-signature";

test("sender domain is read from EMAIL_FROM", () => {
  assert.equal(senderDomain("Vyhel <orders@vyhel.co.in>"), "vyhel.co.in");
  assert.equal(senderDomain("orders@Vyhel.co.in"), "vyhel.co.in");
  assert.equal(senderDomain("Vyhel <onboarding@resend.dev>"), "resend.dev");
  assert.equal(senderDomain("not an address"), null);
});

test("Resend's testing-mode refusal is explained and never echoes addresses", () => {
  const msg = "You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.";
  const e = describeResendError(403, { name: "validation_error", message: msg });
  assert.match(e, /verified domain/);
  assert.match(e, /EMAIL_FROM/);
  assert.doesNotMatch(e, /@/);
});

test("other Resend errors are redacted and bounded", () => {
  const e = describeResendError(422, { name: "validation_error", message: "Invalid `to` field: buyer@example.com" });
  assert.match(e, /Resend 422 validation_error/);
  assert.doesNotMatch(e, /buyer@example\.com/);
  assert.ok(describeResendError(500, { message: "x".repeat(1000) }).length <= 300);
  assert.equal(redactEmails("to a.b+c@mail.example.in failed"), "to [email] failed");
});

const secret = `whsec_${Buffer.from("resend-test-secret-key").toString("base64")}`;
const sign = (id: string, ts: string, body: string, key = secret) =>
  `v1,${createHmac("sha256", Buffer.from(key.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`;

test("Resend (Svix) webhook signature: valid, tampered, stale and malformed", () => {
  const now = 1_800_000_000;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "em_1" } });
  const ts = String(now);
  const good = sign("msg_1", ts, body);
  assert.equal(verifyResendWebhook({ rawBody: body, id: "msg_1", timestamp: ts, signature: good, secret, nowSeconds: now }), true);
  assert.equal(verifyResendWebhook({ rawBody: body, id: "msg_1", timestamp: ts, signature: `v1,bogus ${good}`, secret, nowSeconds: now }), true, "any listed signature may match");
  assert.equal(verifyResendWebhook({ rawBody: body + " ", id: "msg_1", timestamp: ts, signature: good, secret, nowSeconds: now }), false, "body tampered");
  assert.equal(verifyResendWebhook({ rawBody: body, id: "msg_2", timestamp: ts, signature: good, secret, nowSeconds: now }), false, "id tampered");
  assert.equal(verifyResendWebhook({ rawBody: body, id: "msg_1", timestamp: ts, signature: good, secret, nowSeconds: now + 600 }), false, "stale");
  assert.equal(verifyResendWebhook({ rawBody: body, id: "msg_1", timestamp: ts, signature: sign("msg_1", ts, body, `whsec_${Buffer.from("other").toString("base64")}`), secret, nowSeconds: now }), false, "wrong key");
  assert.equal(verifyResendWebhook({ rawBody: body, id: null, timestamp: ts, signature: good, secret, nowSeconds: now }), false);
});
