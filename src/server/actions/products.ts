"use server";

import { and, eq, inArray, like, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { inspectAffiliateLink } from "@/lib/amazon";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { linesToArray, slugify } from "@/lib/utils";
import {
  SLUG_RE,
  bool,
  fail,
  handleError,
  ids,
  num,
  opt,
  revalidatePublic,
  str,
  success,
  validUrl,
  type ActionState,
} from "./utils";

const { products, affiliateLinks, collectionProducts, guideProducts, productRelations } = schema;
const BADGES = schema.productBadge.enumValues;
type Status = (typeof schema.productStatus.enumValues)[number];

function parseScores(fd: FormData, errors: Record<string, string>) {
  const keys = ["usefulnessScore", "easeScore", "versatilityScore", "valueScore", "designScore", "vyhelScore"] as const;
  const out = {} as Record<(typeof keys)[number], number | null>;
  for (const k of keys) {
    const v = num(fd, k);
    if (v !== null && (Number.isNaN(v) || v < 0 || v > 10)) errors[k] = "Use a number from 0 to 10.";
    out[k] = v === null || Number.isNaN(v) ? null : Math.round(v * 10) / 10;
  }
  if (out.vyhelScore === null) {
    const parts = [out.usefulnessScore, out.easeScore, out.versatilityScore, out.valueScore, out.designScore].filter(
      (v): v is number => v !== null,
    );
    if (parts.length) out.vyhelScore = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
  }
  return out;
}

function parseFaq(fd: FormData) {
  const qs = fd.getAll("faqQuestion").map((v) => String(v).trim());
  const as = fd.getAll("faqAnswer").map((v) => String(v).trim());
  return qs.map((q, i) => ({ question: q, answer: as[i] ?? "" })).filter((f) => f.question && f.answer);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const db = getDb();
  const root = slugify(base) || "product";
  const taken = await db
    .select({ slug: products.slug })
    .from(products)
    .where(and(like(products.slug, `${root}%`), excludeId ? ne(products.id, excludeId) : undefined));
  const set = new Set(taken.map((t) => t.slug));
  if (!set.has(root)) return root;
  for (let i = 2; i < 500; i++) if (!set.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}

export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const settings = await getSettings();
    const db = getDb();
    const id = opt(fd, "id");
    const intent = str(fd, "intent") || "save";
    const errors: Record<string, string> = {};

    const name = str(fd, "name");
    if (!name) errors.name = "Give the product a name.";
    let slug = str(fd, "slug");
    if (slug && !SLUG_RE.test(slug)) errors.slug = "Lowercase letters, numbers and hyphens only.";
    if (!slug && name) slug = await uniqueSlug(name, id ?? undefined);

    const categoryId = opt(fd, "categoryId");
    const specialLink = opt(fd, "specialLink");
    const amazonUrl = opt(fd, "amazonUrl");
    const imageUrl = opt(fd, "imageUrl");
    const imageSource = opt(fd, "imageSource");
    const badge = opt(fd, "badge");
    const scores = parseScores(fd, errors);

    if (specialLink) {
      const check = inspectAffiliateLink(specialLink, settings.amazonAssociateId || null);
      if (!check.ok) errors.specialLink = check.errors[0];
    }
    if (!validUrl(amazonUrl, { httpsOnly: true })) errors.amazonUrl = "Must be an https:// URL.";
    if (!validUrl(imageUrl, { allowRelative: true })) errors.imageUrl = "Must be a URL or a media library path.";
    if (imageUrl && !imageSource) errors.imageSource = "Say where this image comes from and why Vyhel may use it.";
    for (const k of ["ogImage", "canonicalUrl"]) if (!validUrl(opt(fd, k), { allowRelative: true })) errors[k] = "Must be a valid URL.";
    if (badge && !(BADGES as readonly string[]).includes(badge)) errors.badge = "Unknown badge.";

    // Current status unless the editor explicitly changes it.
    let current: Status = "draft";
    let publishedAt: Date | null = null;
    if (id) {
      const [row] = await db.select({ status: products.status, publishedAt: products.publishedAt }).from(products).where(eq(products.id, id));
      if (!row) return fail("This product no longer exists.");
      current = row.status;
      publishedAt = row.publishedAt;
    }
    const status: Status = intent === "publish" ? "published" : intent === "draft" ? "draft" : intent === "archive" ? "archived" : current;

    if (status === "published") {
      if (!categoryId) errors.categoryId = "Choose a category before publishing.";
      if (!specialLink) errors.specialLink = "Paste the Amazon Special Link before publishing.";
      if (!str(fd, "shortDescription")) errors.shortDescription = "Add a short description before publishing.";
    }
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);

    const values = {
      name,
      slug,
      brand: opt(fd, "brand"),
      asin: opt(fd, "asin")?.toUpperCase() ?? (specialLink ? inspectAffiliateLink(specialLink).asin : null),
      categoryId,
      subcategory: opt(fd, "subcategory"),
      shortDescription: str(fd, "shortDescription"),
      editorialStatement: opt(fd, "editorialStatement"),
      description: str(fd, "description"),
      whyPicked: opt(fd, "whyPicked"),
      bestFor: linesToArray(fd.get("bestFor")),
      notFor: linesToArray(fd.get("notFor")),
      thingsToKnow: opt(fd, "thingsToKnow"),
      pros: linesToArray(fd.get("pros")),
      cons: linesToArray(fd.get("cons")),
      whoShouldBuy: opt(fd, "whoShouldBuy"),
      whoShouldSkip: opt(fd, "whoShouldSkip"),
      faq: parseFaq(fd),
      ...scores,
      badge: (badge as (typeof BADGES)[number]) ?? null,
      imageUrl,
      imageAlt: opt(fd, "imageAlt"),
      imageSource,
      seoTitle: opt(fd, "seoTitle"),
      seoDescription: opt(fd, "seoDescription"),
      ogTitle: opt(fd, "ogTitle"),
      ogDescription: opt(fd, "ogDescription"),
      ogImage: opt(fd, "ogImage"),
      canonicalUrl: opt(fd, "canonicalUrl"),
      featured: bool(fd, "featured"),
      editorsPick: bool(fd, "editorsPick"),
      status,
      publishedAt: status === "published" ? (publishedAt ?? new Date()) : publishedAt,
      updatedAt: new Date(),
    };

    const productId = await db.transaction(async (tx) => {
      let pid = id;
      if (pid) {
        await tx.update(products).set(values).where(eq(products.id, pid));
      } else {
        const [row] = await tx.insert(products).values({ ...values, createdBy: user.id }).returning({ id: products.id });
        pid = row.id;
      }

      // Primary affiliate link (source of truth lives in affiliate_links).
      if (specialLink) {
        const check = inspectAffiliateLink(specialLink);
        const merchant = ["amazon", "flipkart", "direct", "other"].includes(str(fd, "merchant")) ? str(fd, "merchant") : "amazon";
        const linkValues = {
          merchant,
          label: opt(fd, "merchantLabel") ?? (merchant === "amazon" ? "Amazon" : null),
          specialLink,
          amazonUrl,
          asin: values.asin,
          associateTag: opt(fd, "associateTag") ?? check.tag,
          subTag: opt(fd, "subTag"),
          updatedAt: new Date(),
        };
        const [existing] = await tx
          .select({ id: affiliateLinks.id, specialLink: affiliateLinks.specialLink })
          .from(affiliateLinks)
          .where(and(eq(affiliateLinks.productId, pid), eq(affiliateLinks.isPrimary, true)));
        if (existing) {
          await tx
            .update(affiliateLinks)
            .set({
              ...linkValues,
              // A changed link must be re-verified.
              ...(existing.specialLink !== specialLink ? { status: "unverified" as const, lastCheckedAt: null } : {}),
            })
            .where(eq(affiliateLinks.id, existing.id));
        } else {
          await tx.insert(affiliateLinks).values({ ...linkValues, productId: pid, isPrimary: true });
        }
      }

      // Relationships (only when the form included that section).
      if (fd.has("__collections")) {
        await tx.delete(collectionProducts).where(eq(collectionProducts.productId, pid));
        const c = ids(fd, "collectionIds");
        if (c.length) await tx.insert(collectionProducts).values(c.map((collectionId, i) => ({ collectionId, productId: pid!, sortOrder: 100 + i })));
      }
      if (fd.has("__guides")) {
        await tx.delete(guideProducts).where(eq(guideProducts.productId, pid));
        const g = ids(fd, "guideIds");
        if (g.length) await tx.insert(guideProducts).values(g.map((guideId, i) => ({ guideId, productId: pid!, sortOrder: 100 + i })));
      }
      if (fd.has("__related")) {
        await tx.delete(productRelations).where(eq(productRelations.productId, pid));
        const r = ids(fd, "relatedIds").filter((r) => r !== pid);
        if (r.length) await tx.insert(productRelations).values(r.map((relatedProductId, i) => ({ productId: pid!, relatedProductId, sortOrder: i })));
      }
      return pid;
    });

    await audit(user, "product", productId, id ? (status !== current ? `status:${status}` : "update") : "create", name);
    revalidatePublic();

    const msg = status === "published" && current !== "published" ? "Published." : status === "archived" ? "Archived." : status === "draft" && current === "published" ? "Moved back to draft." : "Saved.";
    return success(msg, {
      id: productId,
      redirectTo: intent === "preview" ? `/admin/products/${productId}/preview` : !id ? `/admin/products/${productId}` : undefined,
    });
  } catch (err) {
    return handleError(err);
  }
}

/** The 2-minute path: name, category, Special Link, a line of copy, a score, optional image. */
export async function quickAddProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const settings = await getSettings();
    const errors: Record<string, string> = {};
    const name = str(fd, "name");
    const categoryId = opt(fd, "categoryId");
    const specialLink = str(fd, "specialLink");
    const description = str(fd, "shortDescription");
    const score = num(fd, "vyhelScore");
    const imageUrl = opt(fd, "imageUrl");
    const imageSource = opt(fd, "imageSource");
    if (!name) errors.name = "Required.";
    if (!categoryId) errors.categoryId = "Required.";
    const check = inspectAffiliateLink(specialLink, settings.amazonAssociateId || null);
    if (!specialLink) errors.specialLink = "Required.";
    else if (!check.ok) errors.specialLink = check.errors[0];
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 10)) errors.vyhelScore = "0–10";
    if (imageUrl && !imageSource) errors.imageSource = "Required when adding an image.";
    const publish = str(fd, "intent") === "publish";
    if (publish && !description) errors.shortDescription = "Add a line before publishing.";
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);

    const db = getDb();
    const slug = await uniqueSlug(name);
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values({
          name,
          slug,
          categoryId,
          shortDescription: description,
          vyhelScore: score === null ? null : Math.round(score * 10) / 10,
          asin: check.asin,
          imageUrl,
          imageSource,
          imageAlt: imageUrl ? name : null,
          status: publish ? "published" : "draft",
          publishedAt: publish ? new Date() : null,
          createdBy: user.id,
        })
        .returning({ id: products.id });
      await tx.insert(affiliateLinks).values({
        productId: row.id,
        merchant: "amazon",
        label: "Amazon",
        specialLink,
        asin: check.asin,
        associateTag: check.tag,
        isPrimary: true,
      });
      return row.id;
    });
    await audit(user, "product", id, publish ? "create:published" : "create", name);
    revalidatePublic();
    return success(publish ? `“${name}” is live.` : `“${name}” saved as a draft.`, { id, redirectTo: `/admin/products/${id}` });
  } catch (err) {
    return handleError(err);
  }
}

export async function setProductStatus(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  const status = str(fd, "status") as Status;
  if (!schema.productStatus.enumValues.includes(status)) return;
  const db = getDb();
  if (status === "published") {
    // Publishing from the list still enforces the publishing rules.
    const [p] = await db.select().from(products).where(eq(products.id, id));
    const [link] = await db.select().from(affiliateLinks).where(and(eq(affiliateLinks.productId, id), eq(affiliateLinks.isPrimary, true)));
    if (!p || !p.categoryId || !link || !p.shortDescription) return;
    await db.update(products).set({ status, publishedAt: p.publishedAt ?? new Date(), updatedAt: new Date() }).where(eq(products.id, id));
  } else {
    await db.update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id));
  }
  await audit(user, "product", id, `status:${status}`);
  revalidatePublic();
}

export async function duplicateProduct(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  const db = getDb();
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) return;
  const slug = await uniqueSlug(`${p.slug}-copy`);
  const { id: _omit, createdAt: _c, updatedAt: _u, publishedAt: _p, ...rest } = p;
  void _omit; void _c; void _u; void _p;
  const [copy] = await db
    .insert(products)
    .values({ ...rest, name: `${p.name} (copy)`, slug, status: "draft", isDemo: false, featured: false, editorsPick: false, createdBy: user.id })
    .returning({ id: products.id });
  const [link] = await db.select().from(affiliateLinks).where(and(eq(affiliateLinks.productId, id), eq(affiliateLinks.isPrimary, true)));
  if (link) {
    const { id: _l, createdAt: _lc, updatedAt: _lu, ...linkRest } = link;
    void _l; void _lc; void _lu;
    await db.insert(affiliateLinks).values({ ...linkRest, productId: copy.id, status: "unverified", lastCheckedAt: null });
  }
  await audit(user, "product", copy.id, "duplicate", `Copied from ${p.name}`);
  redirect(`/admin/products/${copy.id}`);
}

/** Permanent delete — admins only, and only for archived products. */
export async function deleteProduct(fd: FormData) {
  const user = await assertUser("admin");
  const id = str(fd, "id");
  const db = getDb();
  const [p] = await db.select({ status: products.status, name: products.name }).from(products).where(eq(products.id, id));
  if (!p || p.status !== "archived") return;
  await db.delete(products).where(eq(products.id, id));
  await audit(user, "product", id, "delete", p.name);
  revalidatePublic();
  redirect("/admin/products");
}

export async function bulkSetProductStatus(fd: FormData) {
  const user = await assertUser();
  const list = ids(fd, "ids");
  const status = str(fd, "status") as Status;
  if (!list.length || !["draft", "archived"].includes(status)) return;
  await getDb().update(products).set({ status, updatedAt: new Date() }).where(inArray(products.id, list));
  await audit(user, "product", null, `bulk:${status}`, `${list.length} products`);
  revalidatePublic();
}
