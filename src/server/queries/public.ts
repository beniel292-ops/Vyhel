import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { getDb, isDatabaseConfigured, schema } from "@/db";

const { products, categories, collections, collectionProducts, guides, guideProducts, affiliateLinks } = schema;

/* ------------------------------------------------------------------ types */

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  categoryName: string | null;
  categorySlug: string | null;
  vyhelScore: number | null;
  badge: (typeof schema.productBadge.enumValues)[number] | null;
  imageUrl: string | null;
  imageAlt: string | null;
  isDemo: boolean;
};

export type GuideCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  guideType: (typeof schema.guideType.enumValues)[number];
  categoryName: string | null;
  categorySlug: string | null;
  heroImage: string | null;
  heroImageAlt: string | null;
  readingTime: number | null;
  publishedAt: Date | null;
  isDemo: boolean;
};

export type CollectionCardData = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  heroImage: string | null;
  heroImageAlt: string | null;
  productCount: number;
  previewProducts: Pick<ProductCardData, "name" | "imageUrl" | "imageAlt">[];
  isDemo: boolean;
};

export type CategoryCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  imageAlt: string | null;
  productCount: number;
};

/* --------------------------------------------------------------- helpers */

const published = eq(products.status, "published");

const productCardSelect = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  shortDescription: products.shortDescription,
  categoryName: categories.name,
  categorySlug: categories.slug,
  vyhelScore: products.vyhelScore,
  badge: products.badge,
  imageUrl: products.imageUrl,
  imageAlt: products.imageAlt,
  isDemo: products.isDemo,
};

const guideCardSelect = {
  id: guides.id,
  slug: guides.slug,
  title: guides.title,
  excerpt: guides.excerpt,
  guideType: guides.guideType,
  categoryName: categories.name,
  categorySlug: categories.slug,
  heroImage: guides.heroImage,
  heroImageAlt: guides.heroImageAlt,
  readingTime: guides.readingTime,
  publishedAt: guides.publishedAt,
  isDemo: guides.isDemo,
};

/** Every public read goes through here so an unconfigured database renders empty states, not crashes. */
async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return fallback;
  return fn();
}

/* ------------------------------------------------------------- categories */

export const getCategoriesWithCounts = cache(async (): Promise<CategoryCardData[]> =>
  safe([], async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        description: categories.description,
        image: categories.image,
        imageAlt: categories.imageAlt,
        productCount: sql<number>`count(${products.id}) filter (where ${products.status} = 'published')`.mapWith(Number),
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    return rows;
  }),
);

export const getCategoryBySlug = cache(async (slug: string) =>
  safe(null, async () => {
    const db = getDb();
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (!category) return null;
    const [items, relatedGuides] = await Promise.all([
      db
        .select(productCardSelect)
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(and(published, eq(products.categoryId, category.id)))
        .orderBy(desc(products.featured), desc(products.vyhelScore), desc(products.publishedAt)),
      db
        .select(guideCardSelect)
        .from(guides)
        .leftJoin(categories, eq(categories.id, guides.categoryId))
        .where(
          and(
            eq(guides.status, "published"),
            or(
              eq(guides.categoryId, category.id),
              inArray(
                guides.id,
                db
                  .select({ id: schema.guideCategories.guideId })
                  .from(schema.guideCategories)
                  .where(eq(schema.guideCategories.categoryId, category.id)),
              ),
            ),
          ),
        )
        .orderBy(desc(guides.publishedAt))
        .limit(6),
    ]);
    return { category, products: items, guides: relatedGuides };
  }),
);

/* --------------------------------------------------------------- products */

/** "Worth a look": products getting attention recently (real click data), then editorial featured flags. */
export const getTrendingProducts = cache(async (limit = 8): Promise<ProductCardData[]> =>
  safe([], async () => {
    const db = getDb();
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentClicks = db
      .select({
        productId: schema.affiliateClicks.productId,
        clicks: sql<number>`count(*)`.as("clicks"),
      })
      .from(schema.affiliateClicks)
      .where(gte(schema.affiliateClicks.clickedAt, since))
      .groupBy(schema.affiliateClicks.productId)
      .as("recent_clicks");
    return db
      .select(productCardSelect)
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(recentClicks, eq(recentClicks.productId, products.id))
      .where(published)
      .orderBy(
        desc(sql`coalesce(${recentClicks.clicks}, 0)`),
        desc(products.featured),
        desc(products.editorsPick),
        desc(products.publishedAt),
      )
      .limit(limit);
  }),
);

export const getHeroProducts = cache(async (): Promise<ProductCardData[]> =>
  safe([], async () =>
    getDb()
      .select(productCardSelect)
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(published)
      .orderBy(desc(products.editorsPick), desc(products.featured), desc(products.vyhelScore))
      .limit(3),
  ),
);

export type ProductFilters = {
  q?: string;
  category?: string;
  bestFor?: string;
  minScore?: number;
  sort?: "featured" | "score" | "newest";
  page?: number;
};

export const PAGE_SIZE = 24;

export async function listProducts(filters: ProductFilters) {
  return safe({ items: [] as ProductCardData[], total: 0 }, async () => {
    const db = getDb();
    const where: SQL[] = [published];
    if (filters.q) {
      const like = `%${filters.q.replace(/[%_]/g, "")}%`;
      where.push(
        or(
          ilike(products.name, like),
          ilike(products.shortDescription, like),
          ilike(products.brand, like),
          ilike(products.subcategory, like),
        )!,
      );
    }
    if (filters.category) where.push(eq(categories.slug, filters.category));
    if (filters.bestFor) where.push(sql`${filters.bestFor} = any(${products.bestFor})`);
    if (filters.minScore) where.push(gte(products.vyhelScore, filters.minScore));

    const order =
      filters.sort === "score"
        ? [sql`${products.vyhelScore} desc nulls last`, desc(products.publishedAt)]
        : filters.sort === "newest"
          ? [desc(products.publishedAt)]
          : [desc(products.featured), desc(products.editorsPick), sql`${products.vyhelScore} desc nulls last`];

    const page = Math.max(1, filters.page ?? 1);
    const [items, [{ total }]] = await Promise.all([
      db
        .select(productCardSelect)
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(and(...where))
        .orderBy(...order)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(and(...where)),
    ]);
    return { items, total };
  });
}

/** Distinct "best for" tags across published products, for the filter bar. */
export const getBestForOptions = cache(async (): Promise<string[]> =>
  safe([], async () => {
    const rows = await getDb().execute<{ tag: string }>(
      sql`select distinct unnest(best_for) as tag from products where status = 'published' order by 1`,
    );
    return rows.map((r) => r.tag);
  }),
);

export async function getProductDetail(slug: string, opts: { includeUnpublished?: boolean } = {}) {
  return safe(null, async () => {
    const db = getDb();
    const [row] = await db
      .select({ product: products, category: categories })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(opts.includeUnpublished ? eq(products.slug, slug) : and(eq(products.slug, slug), published))
      .limit(1);
    if (!row) return null;
    return hydrateProduct(row.product, row.category);
  });
}

export async function getProductDetailById(id: string) {
  return safe(null, async () => {
    const db = getDb();
    const [row] = await db
      .select({ product: products, category: categories })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(eq(products.id, id))
      .limit(1);
    if (!row) return null;
    return hydrateProduct(row.product, row.category);
  });
}

async function hydrateProduct(product: schema.Product, category: schema.Category | null) {
  const db = getDb();
  const [links, alternatives, relatedGuides, inCollections] = await Promise.all([
    db
      .select()
      .from(affiliateLinks)
      .where(eq(affiliateLinks.productId, product.id))
      .orderBy(desc(affiliateLinks.isPrimary), asc(affiliateLinks.createdAt)),
    db
      .select({ ...productCardSelect, relationType: schema.productRelations.relationType })
      .from(schema.productRelations)
      .innerJoin(products, eq(products.id, schema.productRelations.relatedProductId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(schema.productRelations.productId, product.id), published))
      .orderBy(asc(schema.productRelations.sortOrder))
      .limit(4),
    db
      .select(guideCardSelect)
      .from(guideProducts)
      .innerJoin(guides, eq(guides.id, guideProducts.guideId))
      .leftJoin(categories, eq(categories.id, guides.categoryId))
      .where(and(eq(guideProducts.productId, product.id), eq(guides.status, "published")))
      .orderBy(desc(guides.publishedAt))
      .limit(3),
    db
      .select({ slug: collections.slug, name: collections.name })
      .from(collectionProducts)
      .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
      .where(and(eq(collectionProducts.productId, product.id), eq(collections.status, "published"))),
  ]);

  // Fall back to same-category products when nothing is curated yet.
  let alts: ProductCardData[] = alternatives;
  if (alts.length === 0 && product.categoryId) {
    alts = await db
      .select(productCardSelect)
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(published, eq(products.categoryId, product.categoryId), ne(products.id, product.id)))
      .orderBy(desc(products.vyhelScore))
      .limit(3);
  }

  const primaryLink = links.find((l) => l.isPrimary) ?? links[0] ?? null;
  return { product, category, primaryLink, links, alternatives: alts, guides: relatedGuides, collections: inCollections };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;

/* ----------------------------------------------------------------- guides */

export async function listGuides(filter: { type?: string; category?: string; limit?: number } = {}) {
  return safe([] as GuideCardData[], async () => {
    const where: SQL[] = [eq(guides.status, "published")];
    if (filter.type && (schema.guideType.enumValues as readonly string[]).includes(filter.type)) {
      where.push(eq(guides.guideType, filter.type as (typeof schema.guideType.enumValues)[number]));
    }
    if (filter.category) where.push(eq(categories.slug, filter.category));
    return getDb()
      .select(guideCardSelect)
      .from(guides)
      .leftJoin(categories, eq(categories.id, guides.categoryId))
      .where(and(...where))
      .orderBy(desc(guides.featured), desc(guides.publishedAt))
      .limit(filter.limit ?? 60);
  });
}

export async function getGuideDetail(slug: string, opts: { includeUnpublished?: boolean; id?: string } = {}) {
  return safe(null, async () => {
    const db = getDb();
    const match = opts.id ? eq(guides.id, opts.id) : eq(guides.slug, slug);
    const [row] = await db
      .select({ guide: guides, category: categories })
      .from(guides)
      .leftJoin(categories, eq(categories.id, guides.categoryId))
      .where(opts.includeUnpublished ? match : and(match, eq(guides.status, "published")))
      .limit(1);
    if (!row) return null;
    const [guideProductRows, related] = await Promise.all([
      db
        .select({ ...productCardSelect, note: guideProducts.note })
        .from(guideProducts)
        .innerJoin(products, eq(products.id, guideProducts.productId))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(and(eq(guideProducts.guideId, row.guide.id), published))
        .orderBy(asc(guideProducts.sortOrder)),
      db
        .select(guideCardSelect)
        .from(schema.guideRelations)
        .innerJoin(guides, eq(guides.id, schema.guideRelations.relatedGuideId))
        .leftJoin(categories, eq(categories.id, guides.categoryId))
        .where(and(eq(schema.guideRelations.guideId, row.guide.id), eq(guides.status, "published")))
        .limit(3),
    ]);
    // Primary links for the products in this guide (for inline CTAs).
    const ids = guideProductRows.map((p) => p.id);
    const links = ids.length
      ? await db
          .select()
          .from(affiliateLinks)
          .where(and(inArray(affiliateLinks.productId, ids), eq(affiliateLinks.isPrimary, true)))
      : [];
    let relatedGuides = related;
    if (relatedGuides.length === 0) {
      relatedGuides = await db
        .select(guideCardSelect)
        .from(guides)
        .leftJoin(categories, eq(categories.id, guides.categoryId))
        .where(and(eq(guides.status, "published"), ne(guides.id, row.guide.id)))
        .orderBy(desc(guides.publishedAt))
        .limit(3);
    }
    return {
      guide: row.guide,
      category: row.category,
      products: guideProductRows.map((p) => ({ ...p, link: links.find((l) => l.productId === p.id) ?? null })),
      related: relatedGuides,
    };
  });
}

export type GuideDetail = NonNullable<Awaited<ReturnType<typeof getGuideDetail>>>;

/* ------------------------------------------------------------ collections */

export async function listCollections(opts: { featuredOnly?: boolean; limit?: number } = {}) {
  return safe([] as CollectionCardData[], async () => {
    const db = getDb();
    const where: SQL[] = [eq(collections.status, "published")];
    if (opts.featuredOnly) where.push(eq(collections.featured, true));
    const rows = await db
      .select()
      .from(collections)
      .where(and(...where))
      .orderBy(asc(collections.sortOrder), asc(collections.name))
      .limit(opts.limit ?? 50);
    if (rows.length === 0) return [];
    const members = await db
      .select({
        collectionId: collectionProducts.collectionId,
        name: products.name,
        imageUrl: products.imageUrl,
        imageAlt: products.imageAlt,
      })
      .from(collectionProducts)
      .innerJoin(products, eq(products.id, collectionProducts.productId))
      .where(
        and(
          inArray(
            collectionProducts.collectionId,
            rows.map((r) => r.id),
          ),
          published,
        ),
      )
      .orderBy(asc(collectionProducts.sortOrder));
    return rows.map((c) => {
      const items = members.filter((m) => m.collectionId === c.id);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        description: c.description,
        heroImage: c.heroImage,
        heroImageAlt: c.heroImageAlt,
        productCount: items.length,
        previewProducts: items.slice(0, 3),
        isDemo: c.isDemo,
      };
    });
  });
}

export async function getCollectionDetail(slug: string, opts: { includeUnpublished?: boolean; id?: string } = {}) {
  return safe(null, async () => {
    const db = getDb();
    const match = opts.id ? eq(collections.id, opts.id) : eq(collections.slug, slug);
    const [collection] = await db
      .select()
      .from(collections)
      .where(opts.includeUnpublished ? match : and(match, eq(collections.status, "published")))
      .limit(1);
    if (!collection) return null;
    const [items, relatedGuides] = await Promise.all([
      db
        .select({ ...productCardSelect, note: collectionProducts.note })
        .from(collectionProducts)
        .innerJoin(products, eq(products.id, collectionProducts.productId))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(and(eq(collectionProducts.collectionId, collection.id), published))
        .orderBy(asc(collectionProducts.sortOrder)),
      db
        .select(guideCardSelect)
        .from(schema.collectionGuides)
        .innerJoin(guides, eq(guides.id, schema.collectionGuides.guideId))
        .leftJoin(categories, eq(categories.id, guides.categoryId))
        .where(and(eq(schema.collectionGuides.collectionId, collection.id), eq(guides.status, "published"))),
    ]);
    const ids = items.map((p) => p.id);
    const links = ids.length
      ? await db
          .select()
          .from(affiliateLinks)
          .where(and(inArray(affiliateLinks.productId, ids), eq(affiliateLinks.isPrimary, true)))
      : [];
    return {
      collection,
      products: items.map((p) => ({ ...p, link: links.find((l) => l.productId === p.id) ?? null })),
      guides: relatedGuides,
    };
  });
}

/* ----------------------------------------------------------------- search */

export type SearchResults = {
  products: ProductCardData[];
  guides: GuideCardData[];
  collections: { slug: string; name: string; tagline: string | null }[];
  categories: { slug: string; name: string; description: string }[];
};

export async function searchAll(query: string, limit = 6): Promise<SearchResults> {
  const empty: SearchResults = { products: [], guides: [], collections: [], categories: [] };
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return empty;
  return safe(empty, async () => {
    const db = getDb();
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const [p, g, c, cat] = await Promise.all([
      db
        .select(productCardSelect)
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(
          and(
            published,
            or(
              ilike(products.name, like),
              ilike(products.shortDescription, like),
              ilike(products.brand, like),
              ilike(products.subcategory, like),
              sql`exists (select 1 from unnest(${products.bestFor}) t where t ilike ${like})`,
            ),
          ),
        )
        .orderBy(sql`case when ${products.name} ilike ${like} then 0 else 1 end`, desc(products.vyhelScore))
        .limit(limit),
      db
        .select(guideCardSelect)
        .from(guides)
        .leftJoin(categories, eq(categories.id, guides.categoryId))
        .where(and(eq(guides.status, "published"), or(ilike(guides.title, like), ilike(guides.excerpt, like))))
        .orderBy(desc(guides.publishedAt))
        .limit(limit),
      db
        .select({ slug: collections.slug, name: collections.name, tagline: collections.tagline })
        .from(collections)
        .where(
          and(
            eq(collections.status, "published"),
            or(ilike(collections.name, like), ilike(collections.description, like), ilike(collections.tagline, like)),
          ),
        )
        .limit(4),
      db
        .select({ slug: categories.slug, name: categories.name, description: categories.description })
        .from(categories)
        .where(or(ilike(categories.name, like), ilike(categories.description, like)))
        .limit(4),
    ]);
    return { products: p, guides: g, collections: c, categories: cat };
  });
}

/* ---------------------------------------------------------------- sitemap */

export async function getSitemapEntries() {
  return safe({ products: [], guides: [], collections: [], categories: [] } as {
    products: { slug: string; updatedAt: Date }[];
    guides: { slug: string; updatedAt: Date }[];
    collections: { slug: string; updatedAt: Date }[];
    categories: { slug: string; updatedAt: Date }[];
  }, async () => {
    const db = getDb();
    const [p, g, c, cat] = await Promise.all([
      db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(published),
      db
        .select({ slug: guides.slug, updatedAt: guides.updatedAt })
        .from(guides)
        .where(eq(guides.status, "published")),
      db
        .select({ slug: collections.slug, updatedAt: collections.updatedAt })
        .from(collections)
        .where(eq(collections.status, "published")),
      db.select({ slug: categories.slug, updatedAt: categories.updatedAt }).from(categories),
    ]);
    return { products: p, guides: g, collections: c, categories: cat };
  });
}
