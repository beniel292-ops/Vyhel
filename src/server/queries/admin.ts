import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { products, categories, affiliateLinks, affiliateClicks, guides, collections, collectionProducts, analyticsEvents } = schema;

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/* --------------------------------------------------------------- overview */

export async function getOverview() {
  const db = getDb();
  const week = daysAgo(7);
  const [[p], [g], [c], [cat], [clicksAll], [clicksWeek], topProduct, topGuide, recent, attention] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        published: sql<number>`count(*) filter (where ${products.status} = 'published')`.mapWith(Number),
        drafts: sql<number>`count(*) filter (where ${products.status} = 'draft')`.mapWith(Number),
      })
      .from(products),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        published: sql<number>`count(*) filter (where ${guides.status} = 'published')`.mapWith(Number),
      })
      .from(guides),
    db
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        published: sql<number>`count(*) filter (where ${collections.status} = 'published')`.mapWith(Number),
      })
      .from(collections),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(categories),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(affiliateClicks),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(affiliateClicks).where(gte(affiliateClicks.clickedAt, week)),
    db
      .select({ id: products.id, name: products.name, clicks: sql<number>`count(*)`.mapWith(Number) })
      .from(affiliateClicks)
      .innerJoin(products, eq(products.id, affiliateClicks.productId))
      .where(gte(affiliateClicks.clickedAt, daysAgo(30)))
      .groupBy(products.id)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
    db
      .select({ id: guides.id, title: guides.title, views: sql<number>`count(*)`.mapWith(Number) })
      .from(analyticsEvents)
      .innerJoin(guides, eq(guides.id, analyticsEvents.entityId))
      .where(and(eq(analyticsEvents.eventType, "guide_view"), gte(analyticsEvents.createdAt, daysAgo(30))))
      .groupBy(guides.id)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
    db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(8),
    db
      .select({ id: products.id, name: products.name, status: products.status, linkStatus: affiliateLinks.status })
      .from(products)
      .leftJoin(affiliateLinks, and(eq(affiliateLinks.productId, products.id), eq(affiliateLinks.isPrimary, true)))
      .where(
        and(
          eq(products.status, "published"),
          or(sql`${affiliateLinks.id} is null`, inArray(affiliateLinks.status, ["unverified", "broken"])),
        ),
      )
      .limit(6),
  ]);
  return {
    products: p,
    guides: g,
    collections: c,
    categories: cat.total,
    clicksAll: clicksAll.n,
    clicksWeek: clicksWeek.n,
    topProduct: topProduct[0] ?? null,
    topGuide: topGuide[0] ?? null,
    recent,
    attention,
  };
}

/* --------------------------------------------------------------- products */

export async function listAdminProducts(f: { q?: string; status?: string; category?: string; link?: string; page: number }) {
  const db = getDb();
  const where: SQL[] = [];
  if (f.q) where.push(or(ilike(products.name, `%${f.q}%`), ilike(products.slug, `%${f.q}%`), ilike(products.asin, `%${f.q}%`))!);
  if (f.status && schema.productStatus.enumValues.includes(f.status as never)) where.push(eq(products.status, f.status as never));
  else where.push(sql`${products.status} <> 'archived'`);
  if (f.category) where.push(eq(products.categoryId, f.category));
  if (f.link === "missing") where.push(sql`${affiliateLinks.id} is null`);
  else if (f.link && schema.linkStatus.enumValues.includes(f.link as never)) where.push(eq(affiliateLinks.status, f.link as never));
  const size = 25;
  const base = db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
      vyhelScore: products.vyhelScore,
      categoryName: categories.name,
      linkStatus: affiliateLinks.status,
      isDemo: products.isDemo,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(affiliateLinks, and(eq(affiliateLinks.productId, products.id), eq(affiliateLinks.isPrimary, true)))
    .where(and(...where));
  const [rows, [{ total }]] = await Promise.all([
    base.orderBy(desc(products.updatedAt)).limit(size).offset((f.page - 1) * size),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(products)
      .leftJoin(affiliateLinks, and(eq(affiliateLinks.productId, products.id), eq(affiliateLinks.isPrimary, true)))
      .where(and(...where)),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / size)) };
}

export async function getProductForEdit(id: string) {
  const db = getDb();
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;
  const [link, cols, gds, rel] = await Promise.all([
    db.select().from(affiliateLinks).where(and(eq(affiliateLinks.productId, id), eq(affiliateLinks.isPrimary, true))),
    db.select({ id: collectionProducts.collectionId }).from(collectionProducts).where(eq(collectionProducts.productId, id)),
    db.select({ id: schema.guideProducts.guideId }).from(schema.guideProducts).where(eq(schema.guideProducts.productId, id)),
    db.select({ id: schema.productRelations.relatedProductId }).from(schema.productRelations).where(eq(schema.productRelations.productId, id)),
  ]);
  return {
    product,
    link: link[0] ?? null,
    collectionIds: cols.map((c) => c.id),
    guideIds: gds.map((g) => g.id),
    relatedIds: rel.map((r) => r.id),
  };
}

/** Lightweight option lists for relationship pickers. */
export async function getPickerOptions() {
  const db = getDb();
  const [cats, cols, gds, prods, mediaItems] = await Promise.all([
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: collections.id, name: collections.name, status: collections.status }).from(collections).orderBy(asc(collections.name)),
    db.select({ id: guides.id, name: guides.title, status: guides.status }).from(guides).orderBy(desc(guides.updatedAt)),
    db
      .select({ id: products.id, name: products.name, status: products.status })
      .from(products)
      .where(sql`${products.status} <> 'archived'`)
      .orderBy(asc(products.name)),
    db
      .select({ id: schema.media.id, url: schema.media.url, alt: schema.media.alt, source: schema.media.source, filename: schema.media.filename })
      .from(schema.media)
      .orderBy(desc(schema.media.createdAt))
      .limit(120),
  ]);
  return { categories: cats, collections: cols, guides: gds, products: prods, media: mediaItems };
}
export type PickerOptions = Awaited<ReturnType<typeof getPickerOptions>>;

/* ----------------------------------------------------------------- guides */

export async function listAdminGuides(f: { q?: string; status?: string }) {
  const where: SQL[] = [];
  if (f.q) where.push(ilike(guides.title, `%${f.q}%`));
  if (f.status && schema.guideStatus.enumValues.includes(f.status as never)) where.push(eq(guides.status, f.status as never));
  else where.push(sql`${guides.status} <> 'archived'`);
  return getDb()
    .select({
      id: guides.id,
      title: guides.title,
      slug: guides.slug,
      status: guides.status,
      guideType: guides.guideType,
      categoryName: categories.name,
      readingTime: guides.readingTime,
      isDemo: guides.isDemo,
      publishedAt: guides.publishedAt,
      updatedAt: guides.updatedAt,
      productCount: sql<number>`(select count(*) from guide_products gp where gp.guide_id = ${guides.id})`.mapWith(Number),
    })
    .from(guides)
    .leftJoin(categories, eq(categories.id, guides.categoryId))
    .where(and(...where))
    .orderBy(desc(guides.updatedAt));
}

export async function getGuideForEdit(id: string) {
  const db = getDb();
  const [guide] = await db.select().from(guides).where(eq(guides.id, id));
  if (!guide) return null;
  const [p, r, c] = await Promise.all([
    db.select({ id: schema.guideProducts.productId }).from(schema.guideProducts).where(eq(schema.guideProducts.guideId, id)).orderBy(asc(schema.guideProducts.sortOrder)),
    db.select({ id: schema.guideRelations.relatedGuideId }).from(schema.guideRelations).where(eq(schema.guideRelations.guideId, id)),
    db.select({ id: schema.guideCategories.categoryId }).from(schema.guideCategories).where(eq(schema.guideCategories.guideId, id)),
  ]);
  return { guide, productIds: p.map((x) => x.id), relatedIds: r.map((x) => x.id), extraCategoryIds: c.map((x) => x.id) };
}

/* ------------------------------------------------------------ collections */

export async function listAdminCollections() {
  return getDb()
    .select({
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      status: collections.status,
      featured: collections.featured,
      sortOrder: collections.sortOrder,
      isDemo: collections.isDemo,
      updatedAt: collections.updatedAt,
      productCount: sql<number>`(select count(*) from collection_products cp where cp.collection_id = ${collections.id})`.mapWith(Number),
    })
    .from(collections)
    .orderBy(asc(collections.sortOrder), asc(collections.name));
}

export async function getCollectionForEdit(id: string) {
  const db = getDb();
  const [collection] = await db.select().from(collections).where(eq(collections.id, id));
  if (!collection) return null;
  const [items, g] = await Promise.all([
    db
      .select({ id: collectionProducts.productId, note: collectionProducts.note })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, id))
      .orderBy(asc(collectionProducts.sortOrder)),
    db.select({ id: schema.collectionGuides.guideId }).from(schema.collectionGuides).where(eq(schema.collectionGuides.collectionId, id)),
  ]);
  return { collection, items, guideIds: g.map((x) => x.id) };
}

/* ------------------------------------------------------------- categories */

export async function listAdminCategories() {
  return getDb()
    .select({
      category: categories,
      productCount: sql<number>`(select count(*) from products p where p.category_id = ${categories.id})`.mapWith(Number),
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/* --------------------------------------------------------- affiliate links */

export async function listAffiliateLinks(f: { q?: string; status?: string }) {
  const where: SQL[] = [];
  if (f.q) where.push(or(ilike(products.name, `%${f.q}%`), ilike(affiliateLinks.specialLink, `%${f.q}%`), ilike(affiliateLinks.asin, `%${f.q}%`))!);
  if (f.status && schema.linkStatus.enumValues.includes(f.status as never)) where.push(eq(affiliateLinks.status, f.status as never));
  return getDb()
    .select({
      link: affiliateLinks,
      productName: products.name,
      productSlug: products.slug,
      productStatus: products.status,
      clicks30: sql<number>`(select count(*) from affiliate_clicks ac where ac.affiliate_link_id = ${affiliateLinks.id} and ac.clicked_at > now() - interval '30 days')`.mapWith(Number),
    })
    .from(affiliateLinks)
    .innerJoin(products, eq(products.id, affiliateLinks.productId))
    .where(and(...where))
    .orderBy(sql`case ${affiliateLinks.status} when 'broken' then 0 when 'unverified' then 1 else 2 end`, asc(products.name));
}

/* -------------------------------------------------------------- analytics */

export async function getAnalytics(days: number) {
  const db = getDb();
  const since = daysAgo(days);
  const evSince = and(gte(analyticsEvents.createdAt, since));
  const clSince = gte(affiliateClicks.clickedAt, since);

  const [
    [traffic],
    [clicks],
    [productViews],
    topPages,
    topProducts,
    topGuides,
    topCategories,
    topCollections,
    sources,
    placements,
    daily,
    searches,
  ] = await Promise.all([
    db
      .select({
        pageViews: sql<number>`count(*) filter (where ${analyticsEvents.eventType} = 'page_view')`.mapWith(Number),
        sessions: sql<number>`count(distinct ${analyticsEvents.sessionId}) filter (where ${analyticsEvents.eventType} = 'page_view')`.mapWith(Number),
      })
      .from(analyticsEvents)
      .where(evSince),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(affiliateClicks).where(clSince),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(analyticsEvents)
      .where(and(evSince, eq(analyticsEvents.eventType, "product_view"))),
    db
      .select({ path: analyticsEvents.path, views: sql<number>`count(*)`.mapWith(Number) })
      .from(analyticsEvents)
      .where(and(evSince, eq(analyticsEvents.eventType, "page_view")))
      .groupBy(analyticsEvents.path)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        clicks: sql<number>`count(${affiliateClicks.id})`.mapWith(Number),
        views: sql<number>`(select count(*) from analytics_events e where e.entity_id = ${products.id} and e.event_type = 'product_view' and e.created_at >= ${since.toISOString()})`.mapWith(Number),
      })
      .from(affiliateClicks)
      .innerJoin(products, eq(products.id, affiliateClicks.productId))
      .where(clSince)
      .groupBy(products.id)
      .orderBy(desc(sql`count(${affiliateClicks.id})`))
      .limit(8),
    db
      .select({
        id: guides.id,
        title: guides.title,
        slug: guides.slug,
        views: sql<number>`count(*)`.mapWith(Number),
        clicks: sql<number>`(select count(*) from affiliate_clicks c where c.page_id = ${guides.id} and c.clicked_at >= ${since.toISOString()})`.mapWith(Number),
      })
      .from(analyticsEvents)
      .innerJoin(guides, eq(guides.id, analyticsEvents.entityId))
      .where(and(evSince, eq(analyticsEvents.eventType, "guide_view")))
      .groupBy(guides.id)
      .orderBy(desc(sql`count(*)`))
      .limit(6),
    db
      .select({ name: categories.name, clicks: sql<number>`count(*)`.mapWith(Number) })
      .from(affiliateClicks)
      .innerJoin(products, eq(products.id, affiliateClicks.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(clSince)
      .groupBy(categories.name)
      .orderBy(desc(sql`count(*)`))
      .limit(6),
    db
      .select({ name: collections.name, views: sql<number>`count(*)`.mapWith(Number) })
      .from(analyticsEvents)
      .innerJoin(collections, eq(collections.id, analyticsEvents.entityId))
      .where(and(evSince, eq(analyticsEvents.eventType, "collection_view")))
      .groupBy(collections.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
    db.execute<{ source: string; visits: number; clicks: number }>(sql`
      select source, sum(visits)::int as visits, sum(clicks)::int as clicks from (
        select source, count(distinct session_id) as visits, 0 as clicks from analytics_events
          where event_type = 'page_view' and created_at >= ${since.toISOString()} group by source
        union all
        select source, 0, count(*) from affiliate_clicks where clicked_at >= ${since.toISOString()} group by source
      ) t group by source order by sum(visits) + sum(clicks) desc limit 8`),
    db
      .select({ placement: affiliateClicks.placement, clicks: sql<number>`count(*)`.mapWith(Number) })
      .from(affiliateClicks)
      .where(clSince)
      .groupBy(affiliateClicks.placement)
      .orderBy(desc(sql`count(*)`)),
    db.execute<{ day: string; views: number; clicks: number }>(sql`
      with days as (select generate_series(date_trunc('day', ${since.toISOString()}::timestamptz), date_trunc('day', now()), interval '1 day') as day)
      select to_char(d.day, 'YYYY-MM-DD') as day,
        (select count(*) from analytics_events e where e.event_type = 'page_view' and date_trunc('day', e.created_at) = d.day)::int as views,
        (select count(*) from affiliate_clicks c where date_trunc('day', c.clicked_at) = d.day)::int as clicks
      from days d order by d.day`),
    db
      .select({ q: sql<string>`${analyticsEvents.meta}->>'q'`, n: sql<number>`count(*)`.mapWith(Number) })
      .from(analyticsEvents)
      .where(and(evSince, eq(analyticsEvents.eventType, "search")))
      .groupBy(sql`${analyticsEvents.meta}->>'q'`)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
  ]);

  return {
    pageViews: traffic.pageViews,
    sessions: traffic.sessions,
    clicks: clicks.n,
    productViews: productViews.n,
    ctr: productViews.n > 0 ? clicks.n / productViews.n : null,
    topPages,
    topProducts,
    topGuides,
    topCategories,
    topCollections,
    sources: [...sources],
    placements,
    daily: [...daily],
    searches,
  };
}

/* ------------------------------------------------------------------ media */

export async function listMedia(q?: string) {
  const where = q ? or(ilike(schema.media.filename, `%${q}%`), ilike(schema.media.alt, `%${q}%`), ilike(schema.media.source, `%${q}%`)) : undefined;
  return getDb().select().from(schema.media).where(where).orderBy(desc(schema.media.createdAt)).limit(200);
}

/* ------------------------------------------------------------------ users */

export async function listUsers() {
  return getDb()
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      disabled: schema.users.disabled,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(asc(schema.users.createdAt));
}

export async function listAudit(limit = 50) {
  return getDb().select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(limit);
}
