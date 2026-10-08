/**
 * Seeds DEVELOPMENT example data. Idempotent: re-running updates rows by slug.
 *   npm run db:seed
 * Remove everything it created from Admin → Settings → "Remove development data".
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { DEFAULT_SETTINGS } from "../src/lib/settings-shape";
import { demoCategories, demoCollections, demoGuides, demoProducts } from "./seed-data";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema });

const avg = (s: Record<string, number>) => {
  const v = Object.values(s);
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
};

const readingTime = (md: string) => Math.max(1, Math.round(md.split(/\s+/).length / 220));

async function main() {
  const now = new Date();

  // Settings: only create if missing — never overwrite an admin's settings.
  await db.insert(schema.siteSettings).values({ key: "site", value: DEFAULT_SETTINGS }).onConflictDoNothing();

  const catIds = new Map<string, string>();
  for (const c of demoCategories) {
    const [row] = await db
      .insert(schema.categories)
      .values({ ...c, isDemo: true })
      .onConflictDoUpdate({ target: schema.categories.slug, set: { ...c, updatedAt: now } })
      .returning({ id: schema.categories.id });
    catIds.set(c.slug, row.id);
  }

  const productIds = new Map<string, string>();
  for (const p of demoProducts) {
    const values = {
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      categoryId: catIds.get(p.category)!,
      subcategory: p.subcategory,
      shortDescription: p.shortDescription,
      editorialStatement: p.editorialStatement,
      description: p.description,
      whyPicked: p.whyPicked,
      bestFor: p.bestFor,
      notFor: p.notFor,
      thingsToKnow: p.thingsToKnow,
      pros: p.pros,
      cons: p.cons,
      whoShouldBuy: p.whoShouldBuy,
      whoShouldSkip: p.whoShouldSkip,
      faq: p.faq,
      vyhelScore: avg(p.scores),
      usefulnessScore: p.scores.usefulness,
      easeScore: p.scores.ease,
      versatilityScore: p.scores.versatility,
      valueScore: p.scores.value,
      designScore: p.scores.design,
      badge: p.badge,
      featured: p.featured,
      editorsPick: p.editorsPick,
      status: "published" as const,
      publishedAt: now,
      isDemo: true,
    };
    const [row] = await db
      .insert(schema.products)
      .values(values)
      .onConflictDoUpdate({ target: schema.products.slug, set: { ...values, publishedAt: undefined, updatedAt: now } })
      .returning({ id: schema.products.id });
    productIds.set(p.slug, row.id);

    const link = `https://www.amazon.in/s?k=${encodeURIComponent(p.searchQuery)}`;
    await db.delete(schema.affiliateLinks).where(eq(schema.affiliateLinks.productId, row.id));
    await db.insert(schema.affiliateLinks).values({
      productId: row.id,
      merchant: "amazon",
      label: "Amazon.in",
      amazonUrl: link,
      specialLink: link,
      status: "unverified",
      isPrimary: true,
      notes: "Development placeholder: an untagged Amazon search URL. Replace with your real Special Link.",
    });
  }

  // Curated alternatives
  const rel = async (a: string, b: string, type = "related") =>
    db
      .insert(schema.productRelations)
      .values({ productId: productIds.get(a)!, relatedProductId: productIds.get(b)!, relationType: type })
      .onConflictDoNothing();
  await rel("adjustable-laptop-stand", "usb-c-hub-7-in-1");
  await rel("adjustable-laptop-stand", "led-desk-lamp");
  await rel("usb-c-hub-7-in-1", "adjustable-laptop-stand");
  await rel("led-desk-lamp", "adjustable-laptop-stand");
  await rel("cordless-car-vacuum", "wd-40-multi-use");
  await rel("wd-40-multi-use", "cordless-car-vacuum");

  const collectionIds = new Map<string, string>();
  for (const c of demoCollections) {
    const { products, ...rest } = c;
    const [row] = await db
      .insert(schema.collections)
      .values({ ...rest, isDemo: true })
      .onConflictDoUpdate({ target: schema.collections.slug, set: { ...rest, updatedAt: now } })
      .returning({ id: schema.collections.id });
    collectionIds.set(c.slug, row.id);
    await db.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, row.id));
    await db.insert(schema.collectionProducts).values(
      products.map((slug, i) => ({ collectionId: row.id, productId: productIds.get(slug)!, sortOrder: i })),
    );
  }

  const guideIds = new Map<string, string>();
  for (const g of demoGuides) {
    const { products, category, ...rest } = g;
    const values = {
      ...rest,
      categoryId: catIds.get(category)!,
      readingTime: readingTime(g.content),
      status: "published" as const,
      publishedAt: now,
      isDemo: true,
    };
    const [row] = await db
      .insert(schema.guides)
      .values(values)
      .onConflictDoUpdate({ target: schema.guides.slug, set: { ...values, publishedAt: undefined, updatedAt: now } })
      .returning({ id: schema.guides.id });
    guideIds.set(g.slug, row.id);
    await db.delete(schema.guideProducts).where(eq(schema.guideProducts.guideId, row.id));
    await db.insert(schema.guideProducts).values(
      products.map((slug, i) => ({ guideId: row.id, productId: productIds.get(slug)!, sortOrder: i })),
    );
  }

  const gRel = async (a: string, b: string) =>
    db
      .insert(schema.guideRelations)
      .values({ guideId: guideIds.get(a)!, relatedGuideId: guideIds.get(b)! })
      .onConflictDoNothing();
  await gRel("college-laptop-accessories", "better-study-desk");
  await gRel("college-laptop-accessories", "usb-c-accessories-that-make-sense");
  await gRel("better-study-desk", "college-laptop-accessories");
  await gRel("usb-c-accessories-that-make-sense", "college-laptop-accessories");

  const cGuide = async (c: string, g: string) =>
    db
      .insert(schema.collectionGuides)
      .values({ collectionId: collectionIds.get(c)!, guideId: guideIds.get(g)! })
      .onConflictDoNothing();
  await cGuide("student-setup", "college-laptop-accessories");
  await cGuide("student-setup", "better-study-desk");
  await cGuide("better-desk", "better-study-desk");
  await cGuide("first-car-essentials", "new-car-owner-essentials");
  await cGuide("creator-setup", "usb-c-accessories-that-make-sense");

  console.log(
    `Seeded development data: ${catIds.size} categories, ${productIds.size} products, ${collectionIds.size} collections, ${guideIds.size} guides.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
