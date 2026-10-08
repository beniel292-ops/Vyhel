# VYHEL — Build Specification & Verification Prompt

> Paste this whole document into an AI assistant (or use it yourself) together with the project folder.
> It describes **everything that was built** for Vyhel. The job of the reader is to **check the code against it** and report, for each item, **PASS / FAIL / NOT FOUND**, with the file that proves it. Do not assume anything works — open the file, or run it.

---

## 0. Instructions to the checker

You are reviewing a Next.js project called **Vyhel** (folder name: `velora website`; the project was originally named "Velora" and later renamed to "Vyhel").

1. Read this spec section by section.
2. For every bullet, find the code that implements it. Quote the file path.
3. Mark each bullet **PASS** (implemented as described), **FAIL** (exists but behaves differently), or **NOT FOUND**.
4. Run: `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Report the result of each.
5. Never print or ask for secret values from `.env.local`. Only report variable **names** that are missing.
6. At the end, list every FAIL / NOT FOUND with a suggested fix.

---

## 1. What Vyhel is

An **editorial product-discovery website** for Indian shoppers with two completely separate product systems:

| | **Affiliate products** | **Digital products** |
|---|---|---|
| Who sells it | An external merchant (Amazon, Flipkart, others) | Vyhel itself |
| How the customer pays | On the merchant's site | Razorpay checkout on Vyhel |
| Delivery | Merchant ships it | Email (Resend) + secure download link |
| Vyhel's revenue | Affiliate commission | Direct sale |
| Admin section | Affiliate Products / Affiliate Links | Digital Products / Digital Orders |

**Rule:** the two systems must never mix. An affiliate product can never enter the Razorpay flow, create an order, or send a Vyhel email. A digital product never appears in the affiliate API.

---

## 2. Tech stack

- **Next.js 16.3.8** (App Router). Uses `src/proxy.ts` (replaces middleware). `params`, `searchParams`, `cookies()` are async.
- **React 19.2**, **Tailwind CSS v4** (design tokens in `src/app/globals.css`).
- **Neon Postgres** via **Drizzle ORM** + `postgres` driver (`prepare: false` for Neon's pooler). **Not Supabase.**
- Migrations with **drizzle-kit** in `drizzle/`: `0000_init`, `0001_constraints`, `0002_rename_to_vyhel`, `0003_digital_products`, `0004_buy_on_amazon_cta`.
- `zod` for validation, `react-markdown` + `remark-gfm` for article bodies.
- Optional storage: `@vercel/blob` (images), `aws4fetch` (S3/Cloudflare R2 presigned URLs for large digital files).
- Fonts self-hosted: Inter (variable), Instrument Serif.
- Razorpay and Resend are called over **plain REST** (no SDKs).

Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `admin:create`, `test`, `test:e2e`.

---

## 3. Public website (`src/app/(site)/`)

Navigation: **Discover** (`/products`), **Guides**, **Collections**, **Categories**, **Shop**, plus a search box (Cmd/Ctrl + K dialog) and a mobile menu.

Pages to verify:

- `/` — home page (editorial layout, featured content, "problems we solve" cards from settings).
- `/products` and `/products/[slug]` — affiliate product listing and detail.
  - Draft, archived or nonexistent product → **real HTTP 404** (not a "soft 404" with status 200). There must be **no `loading.tsx`** under `products/` (it caused the soft 404).
- `/guides`, `/guides/[slug]` — buying guides / comparisons / reviews (Markdown body).
- `/collections`, `/collections/[slug]`, `/categories`, `/categories/[slug]`.
- `/search` — site search (`/api/search`).
- `/shop` and `/shop/[slug]` — **digital products** sold by Vyhel, with the **Buy Now** box.
- `/checkout/success?order=<uuid>` — order confirmation; polls order status; the one-time download token arrives in the URL **fragment** `#t=…` (never in the query string).
- `/download/[token]` — download landing page; shows clear messages for invalid / expired / used-up / revoked / unpaid / unavailable links. **Viewing this page does not use up a download;** only clicking Download does.
- Legal: `/about`, `/contact`, `/privacy`, `/terms`, `/affiliate-disclosure`, `/refund-policy`, `/delivery-policy` (the last two are required by Razorpay).
- `not-found.tsx`, `error.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `icon.svg`.

Responsive requirement: **no horizontal scrolling** at 390px (mobile), 768px (tablet), 1440px (desktop). At tablet width the navbar search box is narrower (`w-40`, `lg:w-60`) and the ⌘K hint is hidden below `lg`.

Images: `FallbackImage.tsx` shows a typographic placeholder instead of the browser's broken-image icon if an image fails to load (used by `Media.tsx` → `EditorialImage`).

---

## 4. Affiliate products

- Admin: **Affiliate Products** (`/admin/products`, new, `[id]`) and **Affiliate Links** (`/admin/affiliate-links`).
- **Quick add** dialog (`QuickAddProduct.tsx`): name, category, affiliate URL → saves a draft with a primary link.
- URL rules: must be a valid URL, **https only** (plain `http://` rejected). Live link inspection shows the Amazon tag and ASIN.
- Merchants: Amazon (default), Flipkart, or any other retailer by label (`src/lib/merchant-name.ts`).
- Public CTA button text is merchant-specific: **"Buy on Amazon"** (default setting `defaultCtaText`, changed from "Check on Amazon" by migration 0004), **"Buy on Flipkart"**, etc.
- CTA links **directly** to the merchant URL (no redirect / no cloaking), opens in a new tab, `rel="sponsored nofollow noopener"`.
- "Paid link · You'll complete your purchase on <Merchant>" disclosure is visible next to the CTA.
- Clicks are tracked in aggregate via `/api/track/click` → `affiliate_clicks` (with placement, e.g. `product_hero`). **No order, no email, no Razorpay script** on affiliate pages.
- No affiliate URL → no broken button; shows "Retailer link coming soon."
- Admin list: search, filter by status and by link status, publish / unpublish, duplicate (creates a draft copy), archive. Permanent delete = admin only and only for archived products.
- Publishing requires: category, short description, affiliate link.
- Link status: unverified / verified / broken, with "Mark verified" and last-checked date.
- Amazon Associates compliance: disclosure page and site-wide disclosure text in Settings.
- JSON API: `GET /api/affiliate-products` (public, published only), `?scope=admin` (login), `POST` (create), `PATCH /api/affiliate-products/[id]`, `DELETE` = archive.

---

## 5. Digital products (sold by Vyhel)

### 5.1 Admin
- `/admin/digital-products` (list with search, status filter, sales and revenue per product), `/new`, `/[id]`.
- Fields: name, slug (auto), short description, Markdown description, price (₹, stored in paise as `price_minor`), "what's included" list, checkout description, image + alt text, deliverable file, featured, sort order.
- Statuses: **draft / active / inactive / archived**. Activating requires a deliverable file and a price between ₹1 and ₹5,00,000.
- **Deliverable file** (`DigitalFileField.tsx`): upload, replace, **remove** (warning shown; removing the file from an active product is blocked by validation). Files are **private** — stored in Postgres (`digital_file_blobs`, bytea) by default, or a private S3/R2 bucket if `S3_*` variables are set.
- Allowed/blocked file types are enforced server-side (e.g. `.exe` rejected); size limits enforced.
- Delete: if the product **has orders it is archived instead** of deleted (orders must stay intact). Hard delete is admin only.
- Archiving a product does **not** break links for people who already bought it.

### 5.2 Customer flow
1. `/shop/[slug]` → **Buy Now · ₹price** → email (required, validated), name (optional), checkbox "I understand this is a digital download" (required).
2. `POST /api/digital-orders` `{productSlug, email, name}` — **the price is read from the database; any amount sent by the browser is ignored.** Creates a `digital_orders` row (status `created`) and a Razorpay order; returns only the public **key id** (never the secret).
3. Razorpay Checkout opens (`checkout.razorpay.com/v1/checkout.js`).
   - Closing the window → "Payment cancelled. You haven't been charged."
   - Failed payment → shows the reason; if the window is then closed it keeps the failure reason and says any debit is refunded automatically.
4. On success the browser posts to `POST /api/payments/razorpay/verify`. The server **verifies the HMAC signature** (`order_id|payment_id` with `RAZORPAY_KEY_SECRET`), fetches the payment from Razorpay to check order id and **amount**, captures it if only "authorized", then marks the order paid.
5. Redirect to `/checkout/success?order=<id>#t=<token>` → "Thank you", masked email, **Download now** (short-lived checkout token: 5 downloads / 24 h).
6. Email (Resend) to the customer with a private download link (**10 downloads / 7 days**), product, amount, short order reference, date, support/reply-to address, plain-text version.
7. Admin sale notification email to `ADMIN_EMAIL` (product, customer, amount, payment id, delivery status, link to the order).

### 5.3 Reliability rules (must all hold)
- **Webhook** `POST /api/payments/razorpay/webhook`: verifies `X-Razorpay-Signature` over the **raw body** with `RAZORPAY_WEBHOOK_SECRET`; handles `payment.captured`, `order.paid`, `payment.failed`; ignores other events with 200.
- De-duplicates by `X-Razorpay-Event-Id` (`payment_events` table). On processing error, the event id is forgotten so Razorpay's retry works.
- The webhook **replies first** and sends the email afterwards with `after()` (Razorpay requires a 2xx within 5 seconds).
- Order goes `created/failed → paid` with **one atomic UPDATE**, so fulfilment happens **exactly once** even if the browser callback and webhook arrive together, or either arrives twice.
- Browser closed after paying → the webhook completes the order and sends the email.
- Webhook amount ≠ order amount → order is **not** marked paid.
- Webhook for an order Vyhel didn't create → ignored.
- A late `payment.failed` never downgrades a paid order.
- A second, different payment for an already-paid order → 409 "contact support for a refund", no second delivery.
- **Email failure never changes the payment status.** Order stays **paid**, delivery becomes **failed** with the error stored; admin can resend.
- Razorpay outage when creating the order → friendly 502, no half-made paid order.
- Rate limits (in memory): checkout 10/min, verify 20/min, downloads 30/min per IP.

### 5.4 Secure downloads
- Tokens are **256-bit random**, stored **only as SHA-256 hashes** (`digital_download_tokens.token_hash`). Nobody, including admins, can read an existing link.
- `GET /api/downloads/[token]` checks, in order: valid → not revoked → order paid → not expired → under the download limit → product still has a file; then **atomically** counts one download and streams the file (`Content-Disposition: attachment`, `Cache-Control: private, no-store`) or redirects to a 60-second presigned S3/R2 URL.
- Any failure → 303 redirect to `/download/[token]?error=<reason>`.
- The limit holds under parallel requests (6 simultaneous requests on a 2-download token → exactly 2 served).
- Private files are not reachable without login; public pages never expose file ids or storage keys.

### 5.5 Admin orders
- `/admin/orders`: list (newest first), 30-day revenue, paid orders, delivery issues, search by email / product / Razorpay order id / payment id / order id prefix, filter by payment and delivery status.
- `/admin/orders/[id]`: customer, amount, payment status, "confirmed by" (checkout/webhook), Razorpay ids, paid date, delivery status + attempts + last error, history of download links (issued, via, downloads used, expiry, state). **Never shows the payment signature or raw tokens.**
- **Resend download email** (admins only): optional corrected email address → old links are **revoked**, a new link is emailed, action is written to `audit_logs`. Resend never creates an order; unpaid orders → 409.

---

## 6. Admin dashboard (`/admin`)

Sidebar groups: **Dashboard · Products** (Digital Products, Affiliate Products) **· Orders** (Digital Orders) **· Content** (Guides, Collections, Categories, Affiliate Links, Media) **· Insights** (Analytics) **· Settings**, plus Account, View site, Logout. Mobile has a menu button.

- **Guides** (draft / review / published / archived; types such as buying guide, comparison, review, problem solver), **Collections**, **Categories** — create, edit, preview (`/admin/(preview)/…`), publish.
- Every form has **Save / Publish / Cancel**; save errors show a toast instead of crashing (including "request too large" and offline).
- **Media library** (`/admin/media`): upload JPG / PNG / WebP / AVIF / GIF, **5 MB limit checked in the browser and on the server**, real file-type sniffing (a `.jpg` that isn't an image is rejected), **SVG rejected**, alt text required, image source + "I'm authorised to use this image" required. Grid, search, copy URL, delete. Stored in Postgres (`media_blobs`) or Vercel Blob; served from `/media/[id]`.
- **Image picker** in forms: "Upload / Library", inline **"Upload & use image"** without leaving the form (`POST /api/media`), **Remove**, preview with "This image URL couldn't be loaded" warning.
- **Analytics** page: page views, events, affiliate clicks (own first-party tracking via `/api/track/event` and `/api/track/click`; optional Google Analytics id).
- **Settings** (admins only): site name, tagline, description, contact email, Instagram/YouTube, default SEO title/description, default OG image, affiliate disclosure, Amazon associate id + marketplace, default CTA text, GA id, Search Console verification, "problems" cards; user management (create editor/admin, revoke sessions).
- **Account**: change password.

---

## 7. Authentication & security

- Own auth (no third-party): passwords hashed with **scrypt**; sessions stored as **SHA-256 hashes** in `sessions`; cookie `vyhel_session` is **HttpOnly, SameSite=Lax, Secure** in production.
- Roles: **admin** and **editor**. Editors cannot: open Settings, resend order emails, hard-delete products, delete digital products.
- Login throttling via `login_attempts` ("Too many attempts").
- Logout deletes the session server-side (old cookie stops working).
- Logged-out users: admin pages redirect to `/admin/login`; admin APIs return **401**.
- **CSRF protection** on admin JSON APIs: POST/PATCH/DELETE must have an `Origin` matching the host — evil origin, missing origin, and `Origin: null` all return **403** (not 500).
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Secrets live only in environment variables, are **never sent to the browser**, never in emails, never committed. Only `NEXT_PUBLIC_SITE_URL` is public.
- Admin actions are written to `audit_logs`.

---

## 8. Database (Neon Postgres, Drizzle)

Tables: `users`, `profiles`, `sessions`, `login_attempts`, `categories`, `products`, `product_relations`, `affiliate_links`, `affiliate_clicks`, `guides`, `guide_categories`, `guide_products`, `guide_relations`, `collections`, `collection_products`, `collection_guides`, `media`, `media_blobs`, `analytics_events`, `audit_logs`, `site_settings`, `digital_products`, `digital_files`, `digital_file_blobs`, `digital_orders`, `digital_download_tokens`, `payment_events`.

Enums: `user_role` (admin, editor) · `product_status` (draft, published, archived) · `guide_status` (draft, review, published, archived) · `collection_status` · `link_status` (unverified, verified, broken) · `digital_product_status` (draft, active, inactive, archived) · `payment_status` (created, paid, failed, refunded) · `delivery_status` (pending, sent, failed).

Consistency rules to check:
- Every paid order has a Razorpay payment id and `paid_at`; payment ids are unique.
- Nothing is delivered for an unpaid order; no download tokens exist for unpaid orders.
- Orders store a **snapshot** of product name and amount — changing the product price later doesn't change old orders.
- One `payment_events` row per Razorpay event id.

---

## 9. API reference (status codes to verify)

| Method & path | Who | Notes |
|---|---|---|
| `GET /api/digital-products` | public | active only, no file info. `?scope=admin` needs login |
| `POST /api/digital-products` | admin/editor | |
| `GET/PATCH /api/digital-products/[id]` | admin/editor | |
| `DELETE /api/digital-products/[id]` | **admin** | archives if it has orders |
| `GET/POST /api/digital-products/files` | admin/editor | private file upload/list |
| `POST /api/digital-orders` | public | start checkout; 400 bad email, 404 inactive/missing product, 429 rate limit, 502 Razorpay down |
| `GET /api/digital-orders` | admin/editor | never returns signatures |
| `GET /api/digital-orders/[id]/status` | public | masked email, no payment ids; 404 for bad id |
| `POST /api/digital-orders/[id]/resend` | **admin** | 409 unpaid, 400 bad email |
| `POST /api/payments/razorpay/verify` | public | 400 bad signature / mismatch, 404 unknown order, 409 duplicate payment |
| `POST /api/payments/razorpay/webhook` | Razorpay | 401 bad/missing signature, 503 if not configured |
| `GET /api/downloads/[token]` | token holder | 200 file or 303 to error page |
| `GET/POST /api/affiliate-products`, `PATCH/DELETE /api/affiliate-products/[id]` | public GET / admin+editor | DELETE = archive |
| `POST /api/media` | admin/editor | image upload, 201 / 400 |
| `GET /api/search`, `POST /api/track/click`, `POST /api/track/event` | public | |

Wrong HTTP method → **405**. Malformed or oversized JSON → **400**.

---

## 10. Environment variables (names only)

Required: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_SITE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
Recommended: `ADMIN_EMAIL`
Optional: `BLOB_READ_WRITE_TOKEN`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `AMAZON_ASSOCIATE_TAG`, `AMAZON_API_KEY`, `AMAZON_API_SECRET`
Test-only (mock servers, never in production): `RAZORPAY_API_BASE`, `RESEND_API_BASE`

`.env.example` must list them; `.env.local` must be in `.gitignore`.

---

## 11. Bugs found in the QA audit and fixed (verify each fix is present)

1. **Soft 404** on unpublished/missing affiliate products → removed `src/app/(site)/products/loading.tsx` and `products/[slug]/loading.tsx`.
2. **Oversized image upload crashed the admin page** → browser-side size check (`data-max-bytes`) + try/catch in `src/components/admin/form.tsx`.
3. **`Origin: null` caused a 500** → `src/lib/auth/api.ts` now returns 403.
4. **Navbar overflowed at 768px** → `src/components/site/Navbar.tsx` tighter gaps, `w-40 lg:w-60` search box.
5. **Failed payment message replaced by "cancelled"** → `src/components/site/BuyBox.tsx` keeps the failure reason.
6. **Webhook could exceed Razorpay's 5-second limit** → email sent via `after()`; Resend timeout 10 s (`webhook/route.ts`, `digital-orders.ts`, `lib/email/resend.ts`).
7. **Missing Cancel buttons / no file removal / no inline image upload** → `PublishBar cancelHref`, `DigitalFileField.tsx`, `pickers.tsx` (`InlineImageUpload`), new `src/app/api/media/route.ts` + `src/server/services/media.ts`.
8. **Broken images showed browser icon** → `src/components/site/FallbackImage.tsx`.
9. **WebP dimensions not read; stray slug error on empty name** → `src/server/services/media.ts`, `src/server/services/digital-products.ts`.

---

## 12. Tests included

- `npm test` — unit tests: Razorpay signature checks, money parsing (`tests/signature.test.ts`, `tests/money.test.ts`).
- `npm run test:e2e` — 24 end-to-end checks across the digital and affiliate flows using a built-in mock of Razorpay and Resend (`tests/e2e/digital-and-affiliate.e2e.ts`); needs the app running with test env values (see README).
- During QA, ~200 browser/API checks were run (admin, uploads, payments, emails, downloads, security, responsive, database) — all passed after the fixes above.

---

## 13. Known limits (not bugs, by design)

- Download links work for whoever has them (normal for emailed downloads), limited to 10 downloads / 7 days, revocable via resend to a new email.
- Rate limiting is per server instance (in memory), not shared across Vercel instances.
- Without S3/R2, digital files are stored in Postgres and Vercel caps uploads at ~4 MB.
- Editors can view orders (including customer emails) but cannot resend.
- Real Razorpay and real Resend have **not** been tested yet — only against mocks. They need real test-mode keys.

---

## 14. Manual tests still to do (with real accounts)

- [ ] Razorpay **Test mode**: successful card payment, UPI `success@razorpay`, UPI `failure@razorpay`, closing the window.
- [ ] Razorpay Dashboard → Webhooks shows **200** responses.
- [ ] Customer email and admin email arrive (check spam, Gmail + Outlook).
- [ ] Download link from the email works; refreshing the success page doesn't send a second email.
- [ ] Full purchase on a real phone (UPI app hand-off).
- [ ] Affiliate "Buy on Amazon" opens the right Amazon page with your tag.
- [ ] After going live: one real purchase + refund.

---

## 15. Expected output from the checker

```
SECTION | ITEM | PASS/FAIL/NOT FOUND | FILE | NOTE
...
BUILD: typecheck ✓/✗ · lint ✓/✗ · unit tests ✓/✗ · build ✓/✗
MISSING ENV VARS (names only): ...
FAILS + SUGGESTED FIXES: ...
```
