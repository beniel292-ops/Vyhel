import "server-only";
import { notFound } from "next/navigation";
import { getSettings } from "./settings";

/**
 * RAZORPAY REVIEW MODE — temporary, reversible switch (Admin → Settings → "Digital-products review mode").
 * Documented in docs/razorpay-review-mode.md. While on:
 *  - public affiliate routes (/products, /guides, /collections, /categories, /search, /affiliate-disclosure) 404
 *  - public affiliate queries in src/server/queries/public.ts return nothing
 *  - GET /api/affiliate-products (public scope) and /api/search return no affiliate items
 *  - the home page, navigation, footer and legal pages describe only the digital-products business
 * Admin pages, data, links, tags, images, clicks and analytics are untouched.
 */
export async function isReviewMode(): Promise<boolean> {
  return (await getSettings()).reviewMode === true;
}

export { REVIEW_COPY } from "./review-copy";

/** Call at the top of an affiliate-only public page: a real HTTP 404 while review mode is on. */
export async function notFoundInReviewMode(): Promise<void> {
  if (await isReviewMode()) notFound();
}
