/**
 * End-to-end test for the DIGITAL (Razorpay) and AFFILIATE (external merchant) flows.
 *
 * It starts a mock Razorpay + Resend server on :4010 and drives the real Vyhel APIs.
 * Start the app pointed at the mock first (test keys only — never real credentials):
 *
 *   RAZORPAY_KEY_ID=rzp_test_e2e RAZORPAY_KEY_SECRET=e2e_secret RAZORPAY_WEBHOOK_SECRET=e2e_whsec \
 *   RAZORPAY_API_BASE=http://localhost:4010 RESEND_API_KEY=re_e2e RESEND_API_BASE=http://localhost:4010 \
 *   ADMIN_EMAIL=admin@example.com npm run build && <same env> npm start
 *
 *   npm run test:e2e            (uses DATABASE_URL from .env.local, BASE_URL defaults to http://localhost:3000)
 *
 * Uses the first admin account by inserting a short-lived session row directly. Test data is
 * prefixed "e2e-" and removed at the end.
 */
import "../../scripts/load-env";
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import http from "node:http";
import postgres from "postgres";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KEY_SECRET = "e2e_secret";
const WEBHOOK_SECRET = "e2e_whsec";
const sql = postgres(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!, { max: 1, prepare: false });

/* ----------------------------------------------------------- mock server */
type Email = { to: string[]; subject: string; html: string; text: string };
const mock = {
  orders: new Map<string, { id: string; amount: number; currency: string }>(),
  payments: new Map<string, { id: string; order_id: string; amount: number; currency: string; status: string }>(),
  emails: [] as Email[],
  failEmails: false,
  captures: 0,
};
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };
    const url = req.url ?? "";
    if (req.method === "POST" && url === "/v1/orders") {
      assert.ok(req.headers.authorization?.startsWith("Basic "), "Razorpay auth header");
      const b = JSON.parse(body);
      const id = `order_${randomBytes(6).toString("hex")}`;
      mock.orders.set(id, { id, amount: b.amount, currency: b.currency });
      return send(200, { id, amount: b.amount, currency: b.currency, receipt: b.receipt, status: "created" });
    }
    const pay = url.match(/^\/v1\/payments\/(pay_\w+)(\/capture)?$/);
    if (pay) {
      const p = mock.payments.get(pay[1]);
      if (!p) return send(404, { error: { description: "not found" } });
      if (pay[2]) {
        mock.captures++;
        p.status = "captured";
      }
      return send(200, p);
    }
    if (req.method === "POST" && url === "/emails") {
      if (mock.failEmails) return send(500, { message: "mock outage" });
      mock.emails.push(JSON.parse(body));
      return send(200, { id: `email_${mock.emails.length}` });
    }
    send(404, {});
  });
});

/* --------------------------------------------------------------- helpers */
let cookie = "";
const origin = new URL(BASE).origin;
async function api(path: string, init: RequestInit & { json?: unknown; auth?: boolean; noOrigin?: boolean } = {}) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.json !== undefined) headers["content-type"] = "application/json";
  if (init.auth) headers.cookie = cookie;
  if (!init.noOrigin && init.method && init.method !== "GET") headers.origin = origin;
  const res = await fetch(BASE + path, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body, redirect: "manual" });
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("json") ? await res.json() : null;
  return { res, data };
}
const sigFor = (orderId: string, paymentId: string) => createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
async function webhook(event: string, payment: Record<string, unknown>, eventId = `evt_${randomBytes(5).toString("hex")}`, badSig = false) {
  const raw = JSON.stringify({ event, payload: { payment: { entity: payment } } });
  const sig = createHmac("sha256", badSig ? "nope" : WEBHOOK_SECRET).update(raw).digest("hex");
  return api("/api/payments/razorpay/webhook", { method: "POST", body: raw, headers: { "content-type": "application/json", "x-razorpay-signature": sig, "x-razorpay-event-id": eventId }, noOrigin: true });
}
function pay(order: { id: string; amount: number; currency: string }) {
  const p = { id: `pay_${randomBytes(6).toString("hex")}`, order_id: order.id, amount: order.amount, currency: order.currency, status: "captured" };
  mock.payments.set(p.id, p);
  return p;
}
const customerEmails = (to: string) => mock.emails.filter((e) => e.to.includes(to) && /purchase is ready/i.test(e.subject));
const results: string[] = [];
async function waitFor<T>(fn: () => Promise<T | null>, ms = 8000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("Timed out waiting for condition");
    await new Promise((r) => setTimeout(r, 200));
  }
}
async function step(name: string, fn: () => Promise<void>) {
  await fn();
  results.push(`✓ ${name}`);
  console.log(`✓ ${name}`);
}

/* ------------------------------------------------------------------ run */
async function main() {
  await new Promise<void>((r) => server.listen(4010, r));
  const [admin] = await sql`select id from users where role = 'admin' and disabled = false order by created_at limit 1`;
  assert.ok(admin, "Need an admin user (npm run admin:create)");
  const token = randomBytes(32).toString("base64url");
  await sql`insert into sessions (id, user_id, expires_at) values (${createHash("sha256").update(token).digest("hex")}, ${admin.id}, now() + interval '1 hour')`;
  cookie = `vyhel_session=${token}`;
  const runId = randomBytes(3).toString("hex");
  const slug = `e2e-digital-${runId}`;
  const fileBytes = Buffer.from(`%PDF-1.4\n% Vyhel e2e test file ${runId}\n`);
  let productId = "";
  let fileId = "";

  try {
    /* ============================ DIGITAL ============================ */
    await step("admin APIs reject anonymous and cross-site requests", async () => {
      assert.equal((await api("/api/digital-products", { method: "POST", json: { name: "x" } })).res.status, 401);
      assert.equal((await api("/api/digital-products", { method: "POST", json: { name: "x" }, auth: true, noOrigin: true })).res.status, 403);
    });

    await step("admin uploads a private deliverable", async () => {
      const fd = new FormData();
      fd.append("file", new Blob([fileBytes], { type: "application/pdf" }), "e2e-guide.pdf");
      const { res, data } = await api("/api/digital-products/files", { method: "POST", body: fd, auth: true });
      assert.equal(res.status, 201, JSON.stringify(data));
      fileId = data.file.id;
    });

    await step("cannot activate a digital product without a file", async () => {
      const { res, data } = await api("/api/digital-products", { method: "POST", auth: true, json: { name: `E2E no file ${runId}`, slug: `${slug}-nofile`, price: "99", status: "active" } });
      assert.equal(res.status, 400);
      assert.ok(data.errors.fileId);
    });

    await step("admin creates an active digital product", async () => {
      const { res, data } = await api("/api/digital-products", { method: "POST", auth: true, json: { name: `E2E Guide ${runId}`, slug, price: "199", fileId, status: "active", shortDescription: "Test product" } });
      assert.equal(res.status, 201, JSON.stringify(data));
      assert.equal(data.product.priceMinor, 19900);
      productId = data.product.id;
    });

    await step("digital product appears publicly without file details", async () => {
      const { data } = await api("/api/digital-products");
      const p = data.items.find((i: { slug: string }) => i.slug === slug);
      assert.ok(p, "listed");
      assert.equal(p.kind, "digital");
      assert.equal("fileId" in p, false);
      assert.equal((await fetch(`${BASE}/shop/${slug}`)).status, 200);
    });

    await step("checkout validates email", async () => {
      const { res } = await api("/api/digital-orders", { method: "POST", json: { productSlug: slug, email: "not-an-email" } });
      assert.equal(res.status, 400);
    });

    let checkout: { orderId: string; razorpay: { orderId: string; amount: number; currency: string; key: string } };
    await step("checkout creates a server-side Razorpay order at the DATABASE price (client amount ignored)", async () => {
      const { res, data } = await api("/api/digital-orders", { method: "POST", json: { productSlug: slug, email: "Buyer@Example.com", name: "Test Buyer", amount: 1, price: 1 } });
      assert.equal(res.status, 201, JSON.stringify(data));
      checkout = data;
      assert.equal(data.razorpay.amount, 19900);
      assert.equal(mock.orders.get(data.razorpay.orderId)?.amount, 19900);
      assert.equal(data.razorpay.key, "rzp_test_e2e");
      assert.equal(JSON.stringify(data).includes(KEY_SECRET), false, "secret never sent to client");
      const [o] = await sql`select payment_status, amount_minor, customer_email from digital_orders where id = ${data.orderId}`;
      assert.equal(o.payment_status, "created");
      assert.equal(o.customer_email, "buyer@example.com");
    });

    const payment = pay({ id: checkout!.razorpay.orderId, amount: 19900, currency: "INR" });

    await step("a forged signature is rejected and the order stays unpaid", async () => {
      const { res } = await api("/api/payments/razorpay/verify", { method: "POST", json: { razorpay_order_id: payment.order_id, razorpay_payment_id: payment.id, razorpay_signature: "deadbeef".repeat(8) } });
      assert.equal(res.status, 400);
      const [o] = await sql`select payment_status from digital_orders where id = ${checkout!.orderId}`;
      assert.equal(o.payment_status, "created");
      assert.equal(customerEmails("buyer@example.com").length, 0);
    });

    let downloadToken = "";
    await step("verified payment marks the order paid, emails the customer and notifies the admin", async () => {
      const { res, data } = await api("/api/payments/razorpay/verify", { method: "POST", json: { razorpay_order_id: payment.order_id, razorpay_payment_id: payment.id, razorpay_signature: sigFor(payment.order_id, payment.id) } });
      assert.equal(res.status, 200, JSON.stringify(data));
      assert.ok(data.downloadToken);
      downloadToken = data.downloadToken;
      const [o] = await sql`select * from digital_orders where id = ${checkout!.orderId}`;
      assert.equal(o.payment_status, "paid");
      assert.equal(o.razorpay_payment_id, payment.id);
      assert.equal(o.delivery_status, "sent");
      const mails = customerEmails("buyer@example.com");
      assert.equal(mails.length, 1);
      assert.match(mails[0].html, /\/download\/[A-Za-z0-9_-]{40,}/);
      assert.equal(/digital_file|\/media\/|blob/.test(mails[0].html), false, "no raw storage URL in email");
      assert.equal(mock.emails.filter((e) => e.to.includes("admin@example.com")).length, 1, "admin notified once");
    });

    await step("repeating verification (refresh / double click) does not deliver twice", async () => {
      const { res } = await api("/api/payments/razorpay/verify", { method: "POST", json: { razorpay_order_id: payment.order_id, razorpay_payment_id: payment.id, razorpay_signature: sigFor(payment.order_id, payment.id) } });
      assert.equal(res.status, 200);
      assert.equal(customerEmails("buyer@example.com").length, 1);
      const [{ n }] = await sql`select count(*)::int n from digital_orders where razorpay_order_id = ${payment.order_id}`;
      assert.equal(n, 1);
    });

    await step("webhook: bad signature rejected; same payment again is idempotent; duplicate event id ignored", async () => {
      assert.equal((await webhook("payment.captured", payment, undefined, true)).res.status, 401);
      const evt = `evt_dup_${runId}`;
      const first = await webhook("payment.captured", payment, evt);
      assert.equal(first.res.status, 200);
      assert.equal(first.data.transitioned, false);
      const second = await webhook("payment.captured", payment, evt);
      assert.equal(second.data.duplicate, true);
      assert.equal(customerEmails("buyer@example.com").length, 1);
    });

    await step("public status endpoint shows only masked details", async () => {
      const { data } = await api(`/api/digital-orders/${checkout!.orderId}/status`);
      assert.equal(data.paymentStatus, "paid");
      assert.equal(data.email.includes("buyer@"), false);
      assert.equal("razorpayPaymentId" in data, false);
    });

    await step("secure download serves the file only for a valid token", async () => {
      const ok = await fetch(`${BASE}/api/downloads/${downloadToken}`, { redirect: "manual" });
      assert.equal(ok.status, 200);
      assert.match(ok.headers.get("content-disposition") ?? "", /attachment/);
      assert.deepEqual(Buffer.from(await ok.arrayBuffer()), fileBytes);
      const bad = await fetch(`${BASE}/api/downloads/${"x".repeat(43)}`, { redirect: "manual" });
      assert.equal(bad.status, 303);
      assert.match(bad.headers.get("location") ?? "", /error=invalid/);
      const page = await fetch(`${BASE}/download/${downloadToken}`);
      assert.equal(page.status, 200);
    });

    await step("download limit is enforced", async () => {
      const [t] = await sql`select max_downloads, download_count from digital_download_tokens where token_hash = ${createHash("sha256").update(downloadToken).digest("hex")}`;
      for (let i = t.download_count; i < t.max_downloads; i++) await fetch(`${BASE}/api/downloads/${downloadToken}`, { redirect: "manual" });
      const r = await fetch(`${BASE}/api/downloads/${downloadToken}`, { redirect: "manual" });
      assert.equal(r.status, 303);
      assert.match(r.headers.get("location") ?? "", /error=exhausted/);
    });

    await step("only admins can resend; resend sends a new link without creating an order", async () => {
      assert.equal((await api(`/api/digital-orders/${checkout!.orderId}/resend`, { method: "POST", json: {} })).res.status, 401);
      const before = await sql`select count(*)::int n from digital_orders`;
      const { res, data } = await api(`/api/digital-orders/${checkout!.orderId}/resend`, { method: "POST", json: {}, auth: true });
      assert.equal(res.status, 200, JSON.stringify(data));
      assert.equal(customerEmails("buyer@example.com").length, 2);
      const after = await sql`select count(*)::int n from digital_orders`;
      assert.equal(after[0].n, before[0].n);
    });

    await step("webhook-first: payment confirmed even if the browser never returns", async () => {
      const { data } = await api("/api/digital-orders", { method: "POST", json: { productSlug: slug, email: "closed-tab@example.com" } });
      const p = pay({ id: data.razorpay.orderId, amount: 19900, currency: "INR" });
      const w = await webhook("order.paid", p);
      assert.equal(w.data.transitioned, true);
      // Delivery runs just after the webhook response (Razorpay wants a reply within 5 s).
      const o = await waitFor(async () => {
        const [row] = await sql`select payment_status, delivery_status from digital_orders where id = ${data.orderId}`;
        return row.delivery_status === "sent" ? row : null;
      });
      assert.equal(o.payment_status, "paid");
      assert.equal(o.delivery_status, "sent");
      const v = await api("/api/payments/razorpay/verify", { method: "POST", json: { razorpay_order_id: p.order_id, razorpay_payment_id: p.id, razorpay_signature: sigFor(p.order_id, p.id) } });
      assert.equal(v.res.status, 200);
      assert.equal(customerEmails("closed-tab@example.com").length, 1, "still exactly one delivery email");
    });

    await step("email outage: payment stays paid, delivery marked failed, admin resend fixes it", async () => {
      const { data } = await api("/api/digital-orders", { method: "POST", json: { productSlug: slug, email: "outage@example.com" } });
      const p = pay({ id: data.razorpay.orderId, amount: 19900, currency: "INR" });
      mock.failEmails = true;
      const v = await api("/api/payments/razorpay/verify", { method: "POST", json: { razorpay_order_id: p.order_id, razorpay_payment_id: p.id, razorpay_signature: sigFor(p.order_id, p.id) } });
      mock.failEmails = false;
      assert.equal(v.res.status, 200);
      const [o] = await sql`select payment_status, delivery_status, last_delivery_error from digital_orders where id = ${data.orderId}`;
      assert.equal(o.payment_status, "paid");
      assert.equal(o.delivery_status, "failed");
      const r = await api(`/api/digital-orders/${data.orderId}/resend`, { method: "POST", json: { email: "outage-fixed@example.com" }, auth: true });
      assert.equal(r.res.status, 200);
      const [o2] = await sql`select delivery_status, customer_email from digital_orders where id = ${data.orderId}`;
      assert.equal(o2.delivery_status, "sent");
      assert.equal(o2.customer_email, "outage-fixed@example.com");
    });

    await step("payment.failed webhook marks an unpaid order failed", async () => {
      const { data } = await api("/api/digital-orders", { method: "POST", json: { productSlug: slug, email: "declined@example.com" } });
      await webhook("payment.failed", { id: `pay_f${runId}`, order_id: data.razorpay.orderId, amount: 19900, currency: "INR", status: "failed", error_description: "Card declined" });
      const [o] = await sql`select payment_status, failure_reason from digital_orders where id = ${data.orderId}`;
      assert.equal(o.payment_status, "failed");
      assert.equal(o.failure_reason, "Card declined");
    });

    await step("inactive digital products cannot be bought", async () => {
      await api(`/api/digital-products/${productId}`, { method: "PATCH", auth: true, json: { status: "inactive" } });
      const { res } = await api("/api/digital-orders", { method: "POST", json: { productSlug: slug, email: "late@example.com" } });
      assert.equal(res.status, 404);
    });

    /* =========================== AFFILIATE =========================== */
    const affSlug = `e2e-affiliate-${runId}`;
    const [cat] = await sql`select id from categories order by sort_order limit 1`;
    let affId = "";
    await step("admin creates an affiliate product through its own API", async () => {
      const { res, data } = await api("/api/affiliate-products", {
        method: "POST",
        auth: true,
        json: { name: `E2E Affiliate ${runId}`, slug: affSlug, categoryId: cat.id, merchant: "amazon", affiliateUrl: "https://www.amazon.in/dp/B0E2ETEST0?tag=vyhel-21", status: "active", shortDescription: "Affiliate test" },
      });
      assert.equal(res.status, 201, JSON.stringify(data));
      affId = data.product.id;
    });

    await step("affiliate product is public with an external merchant link", async () => {
      const { data } = await api("/api/affiliate-products?limit=200");
      const a = data.items.find((i: { slug: string }) => i.slug === affSlug);
      assert.ok(a);
      assert.equal(a.purchase, "external");
      assert.match(a.affiliateUrl, /^https:\/\/www\.amazon\.in\//);
      const html = await (await fetch(`${BASE}/products/${affSlug}`)).text();
      assert.match(html, /href="https:\/\/www\.amazon\.in\/dp\/B0E2ETEST0\?tag=vyhel-21"/);
      assert.match(html, /rel="sponsored nofollow noopener"/);
      assert.match(html, /Buy on Amazon/);
      assert.equal(/checkout\.razorpay\.com|Buy Now ·|Pay ₹/.test(html), false, "no Razorpay on affiliate pages");
    });

    await step("an affiliate product can never enter the Razorpay flow", async () => {
      const ordersBefore = mock.orders.size;
      const [{ n: before }] = await sql`select count(*)::int n from digital_orders`;
      const { res } = await api("/api/digital-orders", { method: "POST", json: { productSlug: affSlug, email: "aff@example.com" } });
      assert.equal(res.status, 404);
      const [{ n: after }] = await sql`select count(*)::int n from digital_orders`;
      assert.equal(after, before, "no digital order created");
      assert.equal(mock.orders.size, ordersBefore, "no Razorpay order created");
      const [{ n: tokens }] = await sql`select count(*)::int n from digital_download_tokens t join digital_orders o on o.id = t.order_id where o.customer_email = 'aff@example.com'`;
      assert.equal(tokens, 0, "no download generated");
    });

    await step("a digital product never appears in the affiliate API", async () => {
      const { data } = await api("/api/affiliate-products?limit=200");
      assert.equal(data.items.some((i: { slug: string }) => i.slug === slug), false);
    });

    await step("affiliate click is tracked without creating any order", async () => {
      const [{ n: before }] = await sql`select count(*)::int n from digital_orders`;
      const r = await fetch(`${BASE}/api/track/click`, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Macintosh) Chrome/140 Safari/537.36" },
        body: JSON.stringify({ productId: affId, placement: "product_hero", pageType: "product", pageId: affId, source: "e2e" }),
      });
      assert.equal(r.status, 204);
      const [{ n: clicks }] = await sql`select count(*)::int n from affiliate_clicks where product_id = ${affId}`;
      assert.equal(clicks, 1);
      const [{ n: after }] = await sql`select count(*)::int n from digital_orders`;
      assert.equal(after, before);
    });

    console.log(`\nAll ${results.length} checks passed.`);
  } finally {
    // Clean up test data.
    await sql`delete from digital_orders where product_id in (select id from digital_products where slug like ${`e2e-digital-${runId}%`})`;
    await sql`delete from digital_products where slug like ${`e2e-digital-${runId}%`}`;
    if (fileId) await sql`delete from digital_files where id = ${fileId}`;
    await sql`delete from products where slug like ${`e2e-affiliate-${runId}%`}`;
    await sql`delete from sessions where id = ${createHash("sha256").update(token).digest("hex")}`;
    await sql.end();
    server.close();
  }
}

main().catch((err) => {
  console.error("\n✗ E2E failed:", err);
  process.exit(1);
});
