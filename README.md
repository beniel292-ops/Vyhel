# Vyhel

**Smart finds. Better buying decisions.**

Vyhel has **two completely separate product systems**:

| | Affiliate products | Digital products |
| --- | --- | --- |
| Who sells it | Amazon / another merchant | **Vyhel** |
| Customer action | "Buy on Amazon" → leaves Vyhel | "Buy Now" → Razorpay checkout on Vyhel |
| Payment | On the merchant's site | Razorpay → verified server-side |
| Delivery | Merchant ships it | Email (Resend) + secure download link |
| Public pages | `/products`, `/products/[slug]` | `/shop`, `/shop/[slug]` |
| APIs | `/api/affiliate-products/*` | `/api/digital-products/*`, `/api/digital-orders/*`, `/api/payments/razorpay/*`, `/api/downloads/[token]` |
| Tables | `products`, `affiliate_links`, `affiliate_clicks` | `digital_products`, `digital_files`, `digital_orders`, `digital_download_tokens`, `payment_events` |
| Admin | Products → Affiliate Products | Products → Digital Products, Orders → Digital Orders |

There is no shared "purchase" endpoint: an affiliate product can't enter the Razorpay flow (checkout only looks up `digital_products`), and a digital product never appears in the affiliate API.

This repository is the complete application: the public site, a database-driven admin, first-party analytics, and SEO.

---

## Contents

1. [Architecture](#architecture)
2. [Tech stack](#tech-stack)
3. [Environment variables](#environment-variables)
4. [Database setup (Neon)](#database-setup-neon)
5. [Migrations & seed data](#migrations--seed-data)
6. [Authentication](#authentication)
7. [Local development](#local-development)
8. [Production deployment (Vercel)](#production-deployment-vercel)
9. [Using the admin](#using-the-admin)
10. [Product creation workflow](#product-creation-workflow)
11. [Amazon Associates setup & compliance](#amazon-associates-setup--compliance)
12. [Analytics](#analytics)
13. [SEO](#seo)
14. [Security notes](#security-notes)
15. [Project structure](#project-structure)
16. [Digital products: Razorpay, delivery & downloads](#digital-products-razorpay-delivery--downloads)
17. [Testing](#testing)

---

## Architecture

```
Browser ──► Next.js (App Router, React Server Components)
              │
              ├─ Public pages (ISR, 5-min revalidate + instant revalidation on every admin save)
              ├─ /admin (server-rendered, session-checked on every request)
              ├─ Server Actions (all mutations: validated with zod, role-checked, audited)
              ├─ /api/track/* (aggregate click & event beacons, no PII)
              └─ /media/[id] (images stored in Postgres when Vercel Blob isn't configured)
              │
              ▼
        Neon Postgres (Drizzle ORM)
```

- **Everything public is database-driven.** Homepage sections, products, guides, collections, categories and the "Start with the problem" prompts all come from the database. Add a product in the admin and it appears on the site.
- **Content graph.** Products ↔ categories, collections (ordered, with notes), guides, curated alternatives (`product_relations`), and guides ↔ related guides/categories. Ready for "people also considered", "budget alternative" etc. later.
- **Multi-merchant ready.** `affiliate_links` is one-to-many per product with a single `is_primary` link (enforced by a partial unique index). Amazon is the default merchant; other networks, direct brands or sponsored placements can be added without schema changes.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, `proxy.ts`) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 with design tokens in `src/app/globals.css` |
| Database | PostgreSQL on **Neon** |
| ORM / migrations | Drizzle ORM + drizzle-kit (SQL migrations in `/drizzle`) |
| Auth | Built-in: scrypt password hashing + database sessions (httpOnly cookie) |
| Markdown | react-markdown + remark-gfm (raw HTML disabled) |
| Media | Vercel Blob (optional) or Postgres |
| Fonts | Inter + Instrument Serif, self-hosted via `next/font/local` |
| Hosting | Vercel |

No UI kits, animation libraries or chart libraries — the design system is small and hand-built for speed.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon **pooled** connection string (host contains `-pooler`). Used by the app. |
| `DATABASE_URL_UNPOOLED` | ✅ for scripts | Neon **direct** connection string. Used by migrations, seed and `admin:create`. |
| `NEXT_PUBLIC_SITE_URL` | ✅ | e.g. `https://vyhel.in`. Canonicals, sitemap, Open Graph. |
| `BLOB_READ_WRITE_TOKEN` | optional | Store uploads in Vercel Blob instead of Postgres. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | ✅ for digital sales | Razorpay API keys. The key id is sent to the browser for Checkout; the secret never leaves the server. |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ for digital sales | Verifies webhook signatures. |
| `RESEND_API_KEY` | ✅ for digital sales | Sends delivery and admin emails. |
| `EMAIL_FROM` | ✅ for digital sales | Sender on a Resend-verified domain, e.g. `Vyhel <orders@yourdomain.com>`. |
| `ADMIN_EMAIL` | recommended | Receives new-sale notifications. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | optional | Private S3/R2 bucket for large digital files. |
| `AMAZON_ASSOCIATE_TAG`, `AMAZON_API_KEY`, `AMAZON_API_SECRET` | optional | Reserved for a future, approved server-side integration. Never used client-side. |

Only `NEXT_PUBLIC_SITE_URL` is exposed to the browser. Never commit `.env.local`.

## Database setup (Neon)

1. Create a project at [neon.tech](https://neon.tech) (choose the region closest to your users — e.g. AWS `ap-south-1` Mumbai for India).
2. Create a database named `vyhel` (or use the default `neondb`).
3. From **Connect**, copy both connection strings:
   - **Pooled** → `DATABASE_URL`
   - **Direct** (toggle "Connection pooling" off) → `DATABASE_URL_UNPOOLED`
4. Put them in `.env.local`.

## Migrations & seed data

```bash
npm install
npm run db:migrate      # applies SQL migrations in /drizzle
npm run db:seed         # optional: development example content
```

- Change the schema in `src/db/schema.ts`, then `npm run db:generate` to create a new migration, review the SQL, and `npm run db:migrate`.
- `npm run db:studio` opens Drizzle Studio to browse data.

**About the seed.** It creates 5 categories, 5 example products, 5 collections and 4 guides. Every seeded row is flagged `is_demo` and shows a visible **"Development example"** label on the site and a **Demo** tag in the admin. Seeded products have *no prices, no ratings*, and placeholder links to plain Amazon search pages with **no Associate tag**, marked `unverified`. Demo product and guide pages are `noindex`. Remove all of it in **Admin → Settings → Danger zone → Remove development data**.

## Authentication

There is no public sign-up. Create the first admin from your machine:

```bash
npm run admin:create -- you@example.com "Your Name"
# prompts for a password (12+ characters, letters and numbers)
```

- Roles: **admin** (everything, including users and settings) and **editor** (content only).
- Sessions: 32-byte random token in an httpOnly, `SameSite=Lax`, `Secure` (in production) cookie; only its SHA-256 hash is stored in `sessions`. 14-day expiry.
- Login is throttled (5 failures per email per 15 minutes) and timing-safe.
- `/admin/*` is gated twice: `src/proxy.ts` (cookie present) and the admin layout + every server action (session validated against the database, role enforced).
- Admins add more users in **Settings → Admin users**; anyone can change their own password in **Account**.

> Why not Postgres Row-Level Security? The browser never talks to the database — every read and write runs on the server through a single, role-checked code path. Authorization lives in `assertUser()` / `requireUser()` / `requireAdmin()`. Public queries only ever select `status = 'published'`.

## Local development

```bash
cp .env.example .env.local   # fill in DATABASE_URL etc.
npm install
npm run db:migrate
npm run db:seed              # optional
npm run admin:create -- you@example.com "Your Name"
npm run dev                  # http://localhost:3000  ·  admin at /admin
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Production deployment (Vercel)

Vercel auto-detects Next.js — no `vercel.json` is needed. Install: `npm install` (uses `package-lock.json`), build: `npm run build`. Node ≥ 20.9 (see `engines`). All routes run on the Node.js runtime (none use Edge).

1. Push the repo to GitHub (`.env.local` is git-ignored — never commit it) and import it in Vercel.
2. Project → Settings → Environment Variables (Production):
   - `DATABASE_URL` (Neon **pooled**), `DATABASE_URL_UNPOOLED` (Neon direct)
   - `NEXT_PUBLIC_SITE_URL` = `https://vyhel.co.in` — baked in at build time, so set it **before** the first deploy
   - `AMAZON_ASSOCIATE_TAG` — your Associate ID (default; Admin → Settings overrides it)
   - Digital sales: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`
   - Optional: `BLOB_READ_WRITE_TOKEN`, `S3_*`
   - **Never** set `RAZORPAY_API_BASE` / `RESEND_API_BASE` (test-only; ignored on production anyway).
   - Tip: keep the Vercel function region close to your Neon region.
3. Run migrations against production once, from your computer, with the **direct** URL:
   ```bash
   DATABASE_URL_UNPOOLED=… npm run db:migrate
   DATABASE_URL_UNPOOLED=… npm run admin:create -- you@example.com "Your Name"
   ```
   `db:migrate` only applies new migrations; it never drops data. Don't run `db:seed` on production (demo content).
4. Deploy, then add `vyhel.co.in` in Vercel → Domains and point DNS as Vercel shows.
5. Uploads go through a serverless function, which Vercel caps at ~4.5 MB per request: keep images under ~4 MB, and use S3/R2 for larger digital files.

## Using the admin

`/admin` — never linked from the public site.

| Area | What it does |
| --- | --- |
| **Overview** | Greeting, quick actions (+ Add Product, + Write Guide, + Create Collection), real counts, clicks, top product, recent activity, links needing attention. |
| **Products** | Search, filter (status, category, link status), paginate. Edit · Preview · Publish/Unpublish · Duplicate · Archive · Delete (admins, archived only). |
| **Guides** | Markdown editor with live preview, related products/guides, extra categories, SEO. Draft → Review → Published → Updated. |
| **Collections** | Ordered product list with per-item notes (first = featured), related guides, featured flag, sort order. Only published products appear publicly, so collections stay current automatically. |
| **Categories** | Create/edit inline. Categories still used by products can't be deleted. |
| **Affiliate Links** | Every merchant link, its tag, status, last checked date and 30-day clicks. Test, mark verified/broken, edit, add secondary links. |
| **Analytics** | 7/30/90-day page views, sessions, Amazon clicks, CTR, daily charts, top products/guides/categories/collections/pages, sources, placements, searches. |
| **Media** | Upload (JPEG/PNG/WebP/AVIF/GIF ≤ 5 MB) with required alt text, source and an authorisation checkbox. Used by every image field's "Library" picker. |
| **Settings** (admin) | Brand, Associate ID, CTA text, disclosure, homepage problem prompts, SEO defaults, GA/Search Console, contact & socials, users, audit log, demo-data removal. |

Every create/update/status change is written to `audit_logs` (who, what, when, entity, action).

Preview pages (`/admin/products/[id]/preview`, guides, collections) render the exact public components with a "Preview" banner, so you see what visitors will see before publishing.

## Product creation workflow

**Fast path (≈2 minutes):** Overview or Products → **+ Add Product** → name, category, paste Special Link, one-line description, score, optional image → **Save draft** or **Publish**. You land in the full editor to add the write-up.

**Full editor** sections: 1 Basics · 2 Amazon · 3 Editorial · 4 Scoring · 5 Images · 6 SEO · 7 Related · 8 Publishing — with **Save draft / Preview / Publish / Archive** in a sticky bar.

Publishing requires a name, category, short description and a Special Link. The overall Vyhel score defaults to the average of the five sub-scores if left blank. Typed values survive validation errors, and you're warned before leaving with unsaved changes.

## Amazon Associates setup & compliance

1. Join Amazon Associates for your marketplace (e.g. amazon.in) and note your Associate ID (e.g. `vyhel-21`).
2. Add it in **Admin → Settings → Amazon Associates**.
3. For each product: find it on Amazon while signed in to Associates → **SiteStripe → Get Link** (or Associates Central → Product Linking) → copy the link.
4. Paste it into the product's **Amazon Special Link** field. Vyhel inspects it (Amazon domain? `tag=` present? ASIN?) and warns you, but **never edits, generates, shortens or cloaks it**.
5. Save → **Test destination** → in **Affiliate Links**, **Mark verified** → Publish.

How the site stays compliant:

- CTAs link **directly** to the Special Link (no redirects or cloaking) with `rel="sponsored nofollow noopener"`, opening in a new tab.
- Every CTA has a visible **"Paid link"** label; the footer, guides, collections and product pages show *"As an Amazon Associate I earn from qualifying purchases."* Settings refuses a disclosure that drops this statement.
- **No prices, availability, Amazon ratings, review counts, discounts, bestseller badges or shipping info** are stored or shown. Pages say *"Check current price on Amazon."* `src/lib/merchants` is the extension point for an approved product-data API later (with Amazon's required timestamps and cache limits).
- No scraping of Amazon pages, prices, reviews or images. Images come only from the media library (with a recorded source and an authorisation checkbox) or URLs you're licensed to use.
- Vyhel scores are labelled as editorial scores, not Amazon ratings. Templates never claim personal testing.
- Price-based collections (e.g. "Under ₹1,000") are seeded as **drafts** until compliant pricing exists.

Always re-check the current [Amazon Associates Operating Agreement](https://affiliate-program.amazon.in/help/operating/agreement) and programme policies for your marketplace.

## Analytics

First-party, aggregate, and privacy-friendly:

- **Events:** `page_view`, `product_view`, `guide_view`, `collection_view`, `category_view`, `search`, `cta_click` → `analytics_events`.
- **Affiliate clicks:** `affiliate_clicks` (product, link, page type/id/path, placement, source, campaign, timestamp). Sent with `navigator.sendBeacon` alongside navigation — never delaying or redirecting the visitor.
- **No IP addresses, user agents, cookies or user IDs are stored.** A random per-tab id in `sessionStorage` counts sessions and disappears when the tab closes. Bots and admin pages are ignored.
- **Attribution:** add `?source=instagram&campaign=student_setup` (or standard `utm_source`/`utm_campaign`) to links you share. Otherwise the referrer is classified (google, instagram, youtube, …) or `direct`.
- **Placements** recorded: `product_hero`, `product_sidebar`, `product_footer`, `product_mobile_bar`, `guide_recommendation`, `collection_featured`, `collection_list`.
- Optional Google Analytics: set a `G-` ID in Settings (update the privacy policy if you do).

## SEO

- Per-page titles, descriptions, canonicals and Open Graph (admin-overridable for products, guides, collections and categories).
- JSON-LD: `BreadcrumbList`, `Article` (guides), `ItemList` (collections), `FAQPage` (when FAQs exist), and an editorial `Review` on products (Vyhel's own score — no offers, prices or aggregate ratings). Demo content gets none of it and is `noindex`.
- `sitemap.xml` is generated from published products, guides, collections and categories. Drafts, archived content, `/admin`, `/api` and `/search` are excluded; `robots.txt` disallows them and admin responses carry `X-Robots-Tag: noindex`.
- Default social card at `/opengraph-image`; favicon at `src/app/icon.svg`.

## Security notes

- Secrets are server-only; there are no client-side database or API keys.
- All admin input is validated server-side (zod-style parsing, URL/slug checks, enum checks, size and MIME sniffing for uploads; SVG uploads are refused).
- Markdown is rendered without raw HTML; JSON-LD is escaped.
- Security headers: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`; admin pages are `no-store`.
- Errors never expose stack traces; users see polished 404/500/offline/unauthorized/expired-session states.

## Project structure

```
drizzle/                    SQL migrations
scripts/                    seed, seed data, create-admin, env loader
src/
  app/
    (site)/                 public site: home, products, guides, collections, categories, search, legal
    admin/
      login/  unauthorized/
      (dashboard)/          admin pages (sidebar layout, session-checked)
      (preview)/            full-screen previews of unpublished content
    api/                    search + tracking endpoints
    media/[id]/             DB-stored images
    sitemap.ts robots.ts opengraph-image.tsx icon.svg
  components/
    ui/                     Button, EmptyState, LoadingState, Toast, icons
    site/                   Navbar, Footer, cards, ProductDetailView, GuideDetailView, SearchDialog, AffiliateCTA…
    admin/                  AdminSidebar, form kit, pickers, MarkdownEditor, tables, BarChart
  db/                       schema + client
  lib/                      auth, analytics, amazon link inspection, settings, merchants, utils
  server/
    queries/                public + admin read models
    actions/                server actions (mutations)
  proxy.ts                  admin gate (Next.js 16 "proxy", formerly middleware)
```

## Digital products: Razorpay, delivery & downloads

### Flow

```
/shop/[slug] → Buy Now → email (+ name) → POST /api/digital-orders
   server reads the price from digital_products, creates a Razorpay order, stores digital_orders (status: created)
→ Razorpay Checkout (checkout.js) → customer pays
→ POST /api/payments/razorpay/verify  (HMAC signature check with RAZORPAY_KEY_SECRET; capture if only authorised)
   └─ and/or webhook POST /api/payments/razorpay/webhook (X-Razorpay-Signature check with RAZORPAY_WEBHOOK_SECRET)
→ atomic UPDATE created→paid (exactly one caller wins) → issue download token → Resend email → admin notification
→ /checkout/success?order=…#t=<token>  (polls status; token lives in the URL fragment, never sent to servers)
→ /download/<token> (email link landing page) → /api/downloads/<token> (counts the download, streams the file)
```

**Reliability.** Browser closed after paying → the webhook completes the order. Webhook retries / duplicate events → de-duplicated by `X-Razorpay-Event-Id` and the atomic status update. Refreshing the success page → read-only status polling. Email outage → the order stays **paid**, delivery is marked **failed**, and an admin can **Resend download email** (optionally to a corrected address — old links are revoked).

**Downloads.** 256-bit random tokens, stored only as SHA-256 hashes, tied to one order. Email links: 10 downloads / 7 days. Checkout-page links: 5 downloads / 24 hours. The landing page doesn't count a download (so email link-scanners can't burn the limit). Files live in Postgres (`digital_file_blobs`) or a private S3/R2 bucket — never in `/public`.

### Razorpay setup

1. Create/activate a Razorpay account (KYC). Razorpay reviews your website: it needs the Contact, Terms, Privacy, **Refund & Cancellation** (`/refund-policy`) and **Shipping & Delivery** (`/delivery-policy`) pages — all included.
2. Dashboard → **Account & Settings → API keys** → generate keys. Start with **Test mode** keys (`rzp_test_…`).
3. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (server-only).
4. Dashboard → **Account & Settings → Payment capture**: keep **automatic capture** on (Vyhel also captures authorised payments itself, as a fallback).
5. Dashboard → **Webhooks → Add new webhook**: URL `https://YOUR_DOMAIN/api/payments/razorpay/webhook`, choose a secret, and select **payment.captured**, **order.paid**, **payment.failed**. Put the secret in `RAZORPAY_WEBHOOK_SECRET`. (Webhooks need a public HTTPS URL — `localhost` won't work. Use a Vercel preview/production deployment, or a tunnel to your local machine when testing locally. Razorpay expects a 2xx reply within 5 seconds; Vyhel replies first and sends the email right after.)
6. Test in **Test mode** with Razorpay's test cards and test UPI IDs (`success@razorpay` / `failure@razorpay`) — see Razorpay's docs → *Payments → Test card details*. No real money moves.
7. Test-mode checklist: successful payment · failed payment · closing the payment window · refreshing the success page · webhook delivery shown as **200** in Dashboard → Webhooks · customer + admin emails arrive · download link works.
8. **Going live:** generate **Live mode** keys and replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`; create a **separate live-mode webhook** (test and live webhooks are separate) and put its secret in `RAZORPAY_WEBHOOK_SECRET`; redeploy; make one small real purchase and refund it from the Razorpay Dashboard.

### Resend setup

1. Create a Resend account and an API key → `RESEND_API_KEY`.
2. Add and verify your domain (DNS records) in Resend, then set `EMAIL_FROM="Vyhel <orders@yourdomain.com>"`.
   Until a domain is verified, `onboarding@resend.dev` can only send to your own Resend account address — fine for local testing, not for customers.
   **Production refuses to send** (with a clear error on Admin → Orders) when `EMAIL_FROM` is missing, malformed or a `resend.dev` address — it never falls back silently.
   Vercel applies environment-variable changes only to new deployments, so **redeploy after setting or changing `EMAIL_FROM`**, and set it for the *Production* environment (not only Preview/Development).
3. Set `ADMIN_EMAIL` to receive new-sale notifications.
4. Set a **Contact email** in Admin → Settings — it's used as the support/reply-to address in delivery emails.
5. Check delivery in Resend → **Emails** (each delivery is tagged `type=digital_delivery`). If an email fails, the order stays **paid** with delivery **failed**; fix the cause and use **Resend download email** on the order.

Admin notifications go through `src/lib/notify.ts`. Email is the only channel today; WhatsApp can be added later by implementing one `NotificationChannel` without touching the payment flow.

### Large files (optional S3/R2)

Without extra setup, deliverables are stored in Postgres; on Vercel uploads are capped at ~4 MB by the platform's request limit. For larger files create a **private** bucket (e.g. Cloudflare R2), set `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and add a CORS rule allowing `PUT` from your admin origin. Uploads then go straight to the bucket via presigned URLs and buyers get 60-second presigned downloads after authorisation.

## Testing

```bash
npm run typecheck && npm run lint && npm test     # unit tests: Razorpay signatures, money parsing
```

End-to-end (24 checks across the digital and affiliate flows, using a built-in mock of the Razorpay and Resend APIs — no real money or email):

```bash
# terminal 1 — run the app against the mocks (test values only)
export RAZORPAY_KEY_ID=rzp_test_e2e RAZORPAY_KEY_SECRET=e2e_secret RAZORPAY_WEBHOOK_SECRET=e2e_whsec \
       RAZORPAY_API_BASE=http://localhost:4010 RESEND_API_KEY=re_e2e RESEND_API_BASE=http://localhost:4010 \
       ADMIN_EMAIL=admin@example.com
npm run build && npm start

# terminal 2
npm run test:e2e
```

`RAZORPAY_API_BASE` / `RESEND_API_BASE` exist only for this test; never set them in production.
