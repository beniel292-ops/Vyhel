import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";
import { getSitemapEntries } from "@/server/queries/public";
import { listPublicDigitalProducts } from "@/server/services/digital-products";

export const revalidate = 3600;

/** Published content only. Drafts, archived items, admin and API routes are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [e, shop] = await Promise.all([getSitemapEntries(), listPublicDigitalProducts(500)]);
  const statics = ["/", "/products", "/guides", "/collections", "/categories", "/about", "/contact", "/privacy", "/terms", "/affiliate-disclosure", "/shop", "/refund-policy", "/delivery-policy"];
  return [
    ...statics.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...shop.map((p) => ({ url: absoluteUrl(`/shop/${p.slug}`), priority: 0.8 })),
    ...e.products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, priority: 0.8 })),
    ...e.guides.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: g.updatedAt, priority: 0.8 })),
    ...e.collections.map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), lastModified: c.updatedAt, priority: 0.7 })),
    ...e.categories.map((c) => ({ url: absoluteUrl(`/categories/${c.slug}`), lastModified: c.updatedAt, priority: 0.7 })),
  ];
}
