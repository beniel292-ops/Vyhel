import "server-only";
import { and, asc, desc, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { inspectAffiliateLink } from "@/lib/amazon";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { isReviewMode } from "@/lib/review-mode";
import { categoryExists } from "./categories";

/**
 * AFFILIATE PRODUCTS service — products Vyhel only recommends. The purchase happens on the
 * merchant's site (Amazon etc.). Nothing here touches Razorpay, orders, emails or downloads,
 * and the digital-product services never read these tables.
 */
const { products, affiliateLinks, categories } = schema;
type Status = (typeof schema.productStatus.enumValues)[number];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MERCHANTS = ["amazon", "flipkart", "direct", "other"] as const;

export class AffiliateProductError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string> = {},
    public status = 400,
  ) {
    super(message);
  }
}

export type AffiliateProductInput = {
  name?: unknown;
  slug?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  imageSource?: unknown;
  categoryId?: unknown;
  merchant?: unknown;
  merchantLabel?: unknown;
  affiliateUrl?: unknown;
  /** "active" is accepted as an alias for "published". */
  status?: unknown;
};

const str = (v: unknown, max: number) => (v == null ? "" : String(v).trim().slice(0, max));
const opt = (v: unknown, max: number) => str(v, max) || null;

export function merchantName(merchant: string, label?: string | null) {
  if (label) return label;
  if (merchant === "amazon") return "Amazon";
  if (merchant === "flipkart") return "Flipkart";
  return "the merchant";
}

/** The public affiliate shape — what /api/affiliate-products returns. */
export async function listPublicAffiliateProducts(f: { category?: string; limit?: number } = {}) {
  if (!isDatabaseConfigured()) return [];
  if (await isReviewMode()) return []; // Razorpay review mode: docs/razorpay-review-mode.md
  const where: SQL[] = [eq(products.status, "published")];
  if (f.category) where.push(eq(categories.slug, f.category));
  const rows = await getDb()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      shortDescription: products.shortDescription,
      imageUrl: products.imageUrl,
      imageAlt: products.imageAlt,
      category: categories.name,
      categorySlug: categories.slug,
      score: products.vyhelScore,
      merchant: affiliateLinks.merchant,
      merchantLabel: affiliateLinks.label,
      affiliateUrl: affiliateLinks.specialLink,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(affiliateLinks, and(eq(affiliateLinks.productId, products.id), eq(affiliateLinks.isPrimary, true)))
    .where(and(...where))
    .orderBy(desc(products.featured), desc(products.publishedAt))
    .limit(Math.min(f.limit ?? 60, 200));
  return rows.map((r) => ({ ...r, kind: "affiliate" as const, purchase: "external" as const }));
}

export async function adminListAffiliateProducts(q?: string) {
  const where: SQL[] = [ne(products.status, "archived")];
  if (q) where.push(or(ilike(products.name, `%${q}%`), ilike(products.slug, `%${q}%`))!);
  return getDb()
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
      merchant: affiliateLinks.merchant,
      affiliateUrl: affiliateLinks.specialLink,
    })
    .from(products)
    .leftJoin(affiliateLinks, and(eq(affiliateLinks.productId, products.id), eq(affiliateLinks.isPrimary, true)))
    .where(and(...where))
    .orderBy(asc(products.name));
}

function validate(input: AffiliateProductInput, partial: boolean) {
  const errors: Record<string, string> = {};
  const has = (k: keyof AffiliateProductInput) => !partial || input[k] !== undefined;
  const p: Partial<typeof products.$inferInsert> = {};
  const link: { merchant?: string; label?: string | null; specialLink?: string } = {};

  if (has("name")) {
    p.name = str(input.name, 160);
    if (!p.name) errors.name = "Name is required.";
  }
  if (has("slug") || (!partial && p.name)) {
    p.slug = str(input.slug, 80) || slugify(String(p.name ?? ""));
    if (!SLUG_RE.test(p.slug)) errors.slug = "Lowercase letters, numbers and hyphens only.";
  }
  if (has("shortDescription")) p.shortDescription = str(input.shortDescription, 300);
  if (has("description")) p.description = str(input.description, 5000);
  if (has("imageUrl")) {
    p.imageUrl = opt(input.imageUrl, 1000);
    if (p.imageUrl && !p.imageUrl.startsWith("/") && !/^https:\/\//.test(p.imageUrl)) errors.imageUrl = "Use an https:// URL.";
  }
  if (has("imageAlt")) p.imageAlt = opt(input.imageAlt, 300);
  if (has("imageSource")) p.imageSource = opt(input.imageSource, 300);
  if (p.imageUrl && !p.imageSource && !partial) errors.imageSource = "Say where the image comes from.";
  if (has("categoryId")) {
    p.categoryId = opt(input.categoryId, 40);
    if (p.categoryId && !/^[0-9a-f-]{36}$/i.test(p.categoryId)) errors.categoryId = "Invalid category.";
  }
  if (has("merchant")) {
    const m = str(input.merchant, 20) || "amazon";
    if (!(MERCHANTS as readonly string[]).includes(m)) errors.merchant = `Merchant must be one of ${MERCHANTS.join(", ")}.`;
    link.merchant = m;
  }
  if (has("merchantLabel")) link.label = opt(input.merchantLabel, 60);
  if (has("affiliateUrl")) {
    const url = str(input.affiliateUrl, 2000);
    if (url) {
      const check = inspectAffiliateLink(url);
      if (!check.ok) errors.affiliateUrl = check.errors[0];
      link.specialLink = url;
    }
  }
  if (has("status")) {
    let s = str(input.status, 20) || "draft";
    if (s === "active") s = "published";
    if (s === "inactive") s = "draft";
    if (!(schema.productStatus.enumValues as readonly string[]).includes(s)) errors.status = "Status must be draft, published/active or archived.";
    p.status = s as Status;
  }
  return { errors, p, link };
}

async function upsertPrimaryLink(productId: string, link: { merchant?: string; label?: string | null; specialLink?: string }) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.productId, productId), eq(affiliateLinks.isPrimary, true)));
  if (existing) {
    const changed = link.specialLink && link.specialLink !== existing.specialLink;
    await db
      .update(affiliateLinks)
      .set({
        ...(link.merchant ? { merchant: link.merchant } : {}),
        ...(link.label !== undefined ? { label: link.label } : {}),
        ...(link.specialLink ? { specialLink: link.specialLink, asin: inspectAffiliateLink(link.specialLink).asin, associateTag: inspectAffiliateLink(link.specialLink).tag } : {}),
        ...(changed ? { status: "unverified" as const, lastCheckedAt: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(affiliateLinks.id, existing.id));
  } else if (link.specialLink) {
    const check = inspectAffiliateLink(link.specialLink);
    await db.insert(affiliateLinks).values({
      productId,
      merchant: link.merchant ?? "amazon",
      label: link.label ?? null,
      specialLink: link.specialLink,
      asin: check.asin,
      associateTag: check.tag,
      isPrimary: true,
    });
  }
}

async function primaryLinkUrl(productId: string) {
  const [l] = await getDb()
    .select({ url: affiliateLinks.specialLink })
    .from(affiliateLinks)
    .where(and(eq(affiliateLinks.productId, productId), eq(affiliateLinks.isPrimary, true)));
  return l?.url ?? null;
}

export async function createAffiliateProduct(user: SessionUser, input: AffiliateProductInput) {
  const { errors, p, link } = validate(input, false);
  if (p.categoryId && !errors.categoryId && !(await categoryExists(p.categoryId))) errors.categoryId = "Unknown category.";
  if (p.status === "published") {
    if (!link.specialLink) errors.affiliateUrl = "An affiliate URL is required to publish.";
    if (!p.categoryId) errors.categoryId = "Choose a category before publishing.";
  }
  if (Object.keys(errors).length) throw new AffiliateProductError("Please fix the highlighted fields.", errors);
  const db = getDb();
  const [clash] = await db.select({ id: products.id }).from(products).where(eq(products.slug, p.slug!));
  if (clash) throw new AffiliateProductError("Slug already in use.", { slug: "Already in use." });
  const [row] = await db
    .insert(products)
    .values({ ...(p as typeof products.$inferInsert), publishedAt: p.status === "published" ? new Date() : null, createdBy: user.id })
    .returning();
  await upsertPrimaryLink(row.id, link);
  await audit(user, "product", row.id, "create", `${row.name} (api)`);
  return row;
}

export async function updateAffiliateProduct(user: SessionUser, id: string, input: AffiliateProductInput) {
  const db = getDb();
  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) throw new AffiliateProductError("Affiliate product not found.", {}, 404);
  const { errors, p, link } = validate(input, true);
  if (p.categoryId && !errors.categoryId && !(await categoryExists(p.categoryId))) errors.categoryId = "Unknown category.";
  if (p.slug && p.slug !== existing.slug) {
    const [clash] = await db.select({ id: products.id }).from(products).where(and(eq(products.slug, p.slug), ne(products.id, id)));
    if (clash) errors.slug = "Already in use.";
  }
  const nextStatus = p.status ?? existing.status;
  if (nextStatus === "published") {
    if (!(link.specialLink ?? (await primaryLinkUrl(id)))) errors.affiliateUrl = "An affiliate URL is required to publish.";
    if (!(p.categoryId ?? existing.categoryId)) errors.categoryId = "Choose a category before publishing.";
  }
  if (Object.keys(errors).length) throw new AffiliateProductError("Please fix the highlighted fields.", errors);
  const [row] = await db
    .update(products)
    .set({
      ...p,
      ...(p.status === "published" && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();
  await upsertPrimaryLink(id, link);
  await audit(user, "product", id, p.status && p.status !== existing.status ? `status:${p.status}` : "update", `${row.name} (api)`);
  return row;
}

/** Archive (soft delete). Affiliate products keep click history, so they're never hard-deleted via the API. */
export async function archiveAffiliateProduct(user: SessionUser, id: string) {
  const [row] = await getDb()
    .update(products)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning({ id: products.id, name: products.name });
  if (!row) throw new AffiliateProductError("Affiliate product not found.", {}, 404);
  await audit(user, "product", id, "status:archived", `${row.name} (api)`);
  return row;
}
