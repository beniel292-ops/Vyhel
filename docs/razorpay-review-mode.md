# Razorpay review mode (digital-products-only public site)

A temporary, reversible switch that makes the public site show **only Vyhel's own digital products** — for example while
Razorpay reviews the website. The Amazon affiliate side is hidden from visitors, **not deleted**. Turning the switch off
restores the affiliate site exactly as it was.

## The switch

- **Where:** Admin → Settings → *Digital-products review mode* (admins only). The admin dashboard shows a yellow notice while it is on.
- **Stored as:** `reviewMode: true | false` inside the existing `site_settings` row (`key = 'site'`, JSONB `value`).
  No schema change, no migration. Default when the key is missing: `false` (affiliate site public).
- **Code entry point:** `src/lib/review-mode.ts` → `isReviewMode()`, `notFoundInReviewMode()`. Copy used for metadata/footer: `src/lib/review-copy.ts`.
- Saving Settings calls `revalidatePublic()` (`revalidatePath("/", "layout")`), so cached pages update immediately.
  `sitemap.xml` and the default Open Graph image revalidate within an hour.

## What changes while it is ON

| Area | Behaviour | Where |
|---|---|---|
| `/products`, `/products/[slug]`, `/guides`, `/guides/[slug]`, `/collections`, `/collections/[slug]`, `/categories`, `/categories/[slug]`, `/search`, `/affiliate-disclosure` | Real HTTP **404** | `notFoundInReviewMode()` at the top of each page in `src/app/(site)/…` |
| Every public affiliate query (hero, trending, lists, details, categories, guides, collections, search, sitemap entries) | Returns the empty value | `affiliateRead()` in `src/server/queries/public.ts` |
| `GET /api/affiliate-products` (public) | `{ "items": [] }` (admin `?scope=admin` unchanged) | `listPublicAffiliateProducts()` in `src/server/services/affiliate-products.ts` |
| `GET /api/search` | No affiliate results (uses `searchAll`) | `src/server/queries/public.ts` |
| Home page `/` | Digital-products storefront (`DigitalHome`) | `src/app/(site)/page.tsx`, `src/components/site/DigitalHome.tsx` |
| Navigation | Shop · About · Contact; search hidden | `src/components/site/Navbar.tsx`, `src/app/(site)/layout.tsx` |
| Footer | Shop/Company/Legal links, business details from Settings, no affiliate disclosure | `src/components/site/Footer.tsx` |
| About, Contact, Terms, Privacy, Refund, Delivery | Affiliate-only paragraphs hidden; digital-products wording shown | `src/app/(site)/{about,contact,terms,privacy,refund-policy,delivery-policy}/page.tsx` |
| Site title/description, default OG image | Digital-products wording | `src/app/layout.tsx`, `src/app/opengraph-image.tsx` |
| `sitemap.xml` | Only home, shop, product pages and policies | `src/app/sitemap.ts` |
| 404 page | Links to the Shop instead of products/guides | `src/app/not-found.tsx` |

**Unchanged (always):** `/shop`, `/shop/[slug]`, checkout (`POST /api/digital-orders`), payment verification
(`/api/payments/razorpay/verify`), webhook (`/api/payments/razorpay/webhook`), downloads (`/download/[token]`,
`/api/downloads/[token]`), emails, the whole admin (all affiliate products, links, categories, guides, collections, media,
analytics, clicks), `POST /api/track/click`, and admin previews (`/admin/…/preview`).

## Data that must stay untouched

Nothing in review mode writes to these tables, and restoring needs none of them changed:
`products`, `affiliate_links`, `affiliate_clicks`, `categories`, `guides`, `guide_*`, `collections`, `collection_*`,
`product_relations`, `media`, `media_blobs`, `analytics_events`, `digital_products`, `digital_files`, `digital_file_blobs`,
`digital_orders`, `digital_download_tokens`, `payment_events`. Don't archive, unpublish or delete affiliate products to
"hide" them — the switch already does that without touching their status.

## Restore the affiliate site

1. Admin → Settings → untick **Review mode: show only digital products publicly** → Save settings.
2. Check `/`, `/products`, a product page, `/guides`, `/search?q=…` and the footer disclosure are back.
3. (Optional) Visit `/sitemap.xml` after an hour, or redeploy, to confirm affiliate URLs are listed again.

To remove the feature entirely later: delete `src/lib/review-mode.ts`, `src/lib/review-copy.ts`,
`src/components/site/DigitalHome.tsx`, and every line that references `isReviewMode`, `notFoundInReviewMode`,
`reviewMode` or `REVIEW_COPY` (`git grep -n "reviewMode\|isReviewMode\|notFoundInReviewMode\|REVIEW_COPY"`).
The `legalName`, `supportPhone` and `businessAddress` settings are independent and can stay.

## Production configuration needed for a working digital checkout

Set on Vercel (names only): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`EMAIL_FROM`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`. Razorpay webhook URL:
`https://<domain>/api/payments/razorpay/webhook` with `payment.captured`, `order.paid`, `payment.failed`.
Never set `RAZORPAY_API_BASE` / `RESEND_API_BASE` in production.

Fill in Admin → Settings → Contact & social: contact email, and — if you want them public — business/legal name,
support phone and business address. They appear on the Contact page and in the footer only when filled in.

## Manual checks (can't be done locally)

- With review mode ON on the live site: `/` shows the digital products; `/products`, `/guides`, `/collections`,
  `/categories`, `/search`, `/affiliate-disclosure` and an old product URL return 404; the footer has no affiliate text.
- `/shop/<slug>` for each product: price, cover, what's included, Buy Now, policy links.
- A Razorpay **Test mode** purchase end to end: payment, confirmation page, email, download.
- Razorpay Dashboard → Webhooks shows 2xx deliveries.
- After review, turn the switch off and confirm the affiliate pages are back.
