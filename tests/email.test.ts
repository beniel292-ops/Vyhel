import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { describeResendError, redactEmails } from "../src/lib/email/errors";
import { resolveSender, senderDomain } from "../src/lib/email/sender";
import { verifyResendWebhook } from "../src/lib/email/webhook-signature";

test("sender domain is read from EMAIL_FROM", () => {
  assert.equal(senderDomain("Vyhel <orders@vyhel.co.in>"), "vyhel.co.in");
  assert.equal(senderDomain("orders@Vyhel.co.in"), "vyhel.co.in");
  assert.equal(senderDomain("Vyhel <onboarding@resend.dev>"), "resend.dev");
  assert.equal(senderDomain("not an address"), null);
  assert.equal(senderDomain("Vyhel <orders@vyhel.co.in"), null, "unbalanced bracket");
});

const PROD = { VERCEL_ENV: "production" };

test("production: a verified-domain sender is used exactly as configured", () => {
  for (const value of ["Vyhel <orders@vyhel.co.in>", '"Vyhel <orders@vyhel.co.in>"', "  orders@vyhel.co.in  "]) {
    const r = resolveSender({ ...PROD, EMAIL_FROM: value });
    assert.equal(r.status, "ok", value);
    assert.equal(r.domain, "vyhel.co.in");
    assert.equal(r.issue, null);
    assert.ok(r.from && !r.from.startsWith('"'), "surrounding quotes are stripped");
    assert.ok(r.from!.includes("orders@vyhel.co.in"));
  }
});

test("production: a missing sender blocks sending instead of falling back to resend.dev", () => {
  for (const value of [undefined, "", "   "]) {
    const r = resolveSender({ ...PROD, EMAIL_FROM: value });
    assert.equal(r.status, "missing");
    assert.equal(r.from, null);
    assert.match(r.issue!, /not set/);
    assert.match(r.issue!, /redeploy/);
  }
});

test("production: a resend.dev sender is refused", () => {
  for (const value of ["Vyhel <onboarding@resend.dev>", "onboarding@resend.dev", "x@mail.resend.dev"]) {
    const r = resolveSender({ ...PROD, EMAIL_FROM: value });
    assert.equal(r.status, "test_sender", value);
    assert.equal(r.from, null);
    assert.match(r.issue!, /resend\.dev/);
  }
});

test("production: a malformed sender is refused", () => {
  for (const value of ["Vyhel", "Vyhel <orders@>", "<@vyhel.co.in>"]) {
    const r = resolveSender({ ...PROD, EMAIL_FROM: value });
    assert.equal(r.status, "invalid", value);
    assert.equal(r.from, null);
  }
});

test("local/preview: the Resend test sender is allowed but flagged", () => {
  const missing = resolveSender({ EMAIL_FROM: undefined });
  assert.equal(missing.from, "Vyhel <onboarding@resend.dev>");
  assert.equal(missing.status, "test_sender");
  assert.ok(missing.issue);
  const preview = resolveSender({ VERCEL_ENV: "preview", EMAIL_FROM: "onboarding@resend.dev" });
  assert.equal(preview.from, "onboarding@resend.dev");
  assert.ok(preview.issue);
  const ok = resolveSender({ VERCEL_ENV: "preview", EMAIL_FROM: "Vyhel <orders@vyhel.co.in>" });
  assert.equal(ok.status, "ok");
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
