"use server";

import { and, eq, like, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/session";
import { estimateReadingTime, slugify } from "@/lib/utils";
import { SLUG_RE, bool, fail, handleError, ids, num, opt, revalidatePublic, str, success, validUrl, type ActionState } from "./utils";

const { guides, guideProducts, guideRelations, guideCategories } = schema;
type Status = (typeof schema.guideStatus.enumValues)[number];

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "guide";
  const taken = new Set(
    (
      await getDb()
        .select({ slug: guides.slug })
        .from(guides)
        .where(and(like(guides.slug, `${root}%`), excludeId ? ne(guides.id, excludeId) : undefined))
    ).map((r) => r.slug),
  );
  if (!taken.has(root)) return root;
  for (let i = 2; i < 500; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}

export async function saveGuide(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const db = getDb();
    const id = opt(fd, "id");
    const intent = str(fd, "intent") || "save";
    const errors: Record<string, string> = {};
    const title = str(fd, "title");
    if (!title) errors.title = "Give the guide a title.";
    let slug = str(fd, "slug");
    if (slug && !SLUG_RE.test(slug)) errors.slug = "Lowercase letters, numbers and hyphens only.";
    if (!slug && title) slug = await uniqueSlug(title, id ?? undefined);
    const content = str(fd, "content");
    const guideType = str(fd, "guideType") || "buying_guide";
    if (!(schema.guideType.enumValues as readonly string[]).includes(guideType)) errors.guideType = "Unknown type.";
    const heroImage = opt(fd, "heroImage");
    if (!validUrl(heroImage, { allowRelative: true })) errors.heroImage = "Must be a valid URL.";
    if (!validUrl(opt(fd, "canonicalUrl"))) errors.canonicalUrl = "Must be a valid URL.";
    const readingTimeInput = num(fd, "readingTime");
    const publishedAtInput = opt(fd, "publishedAt");

    let current: Status = "draft";
    let publishedAt: Date | null = null;
    if (id) {
      const [row] = await db.select({ status: guides.status, publishedAt: guides.publishedAt }).from(guides).where(eq(guides.id, id));
      if (!row) return fail("This guide no longer exists.");
      current = row.status;
      publishedAt = row.publishedAt;
    }
    const map: Record<string, Status> = { publish: "published", draft: "draft", review: "review", archive: "archived" };
    const status: Status = map[intent] ?? current;
    if (status === "published") {
      if (!str(fd, "excerpt")) errors.excerpt = "Add an excerpt before publishing.";
      if (content.split(/\s+/).length < 150) errors.content = "Published guides need real substance — at least ~150 words.";
    }
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);

    if (publishedAtInput) {
      const d = new Date(publishedAtInput);
      if (!Number.isNaN(d.getTime())) publishedAt = d;
    }
    const values = {
      title,
      slug,
      subtitle: opt(fd, "subtitle"),
      excerpt: str(fd, "excerpt"),
      content,
      conclusion: opt(fd, "conclusion"),
      guideType: guideType as (typeof schema.guideType.enumValues)[number],
      categoryId: opt(fd, "categoryId"),
      heroImage,
      heroImageAlt: opt(fd, "heroImageAlt"),
      author: str(fd, "author") || "Vyhel Editorial",
      readingTime: readingTimeInput && readingTimeInput > 0 ? Math.round(readingTimeInput) : estimateReadingTime(content),
      seoTitle: opt(fd, "seoTitle"),
      seoDescription: opt(fd, "seoDescription"),
      canonicalUrl: opt(fd, "canonicalUrl"),
      featured: bool(fd, "featured"),
      status,
      publishedAt: status === "published" ? (publishedAt ?? new Date()) : publishedAt,
      updatedAt: new Date(),
    };

    const guideId = await db.transaction(async (tx) => {
      let gid = id;
      if (gid) await tx.update(guides).set(values).where(eq(guides.id, gid));
      else gid = (await tx.insert(guides).values({ ...values, createdBy: user.id }).returning({ id: guides.id }))[0].id;

      if (fd.has("__products")) {
        await tx.delete(guideProducts).where(eq(guideProducts.guideId, gid));
        const p = ids(fd, "productIds");
        if (p.length) await tx.insert(guideProducts).values(p.map((productId, i) => ({ guideId: gid!, productId, sortOrder: i })));
      }
      if (fd.has("__related")) {
        await tx.delete(guideRelations).where(eq(guideRelations.guideId, gid));
        const r = ids(fd, "relatedIds").filter((x) => x !== gid);
        if (r.length) await tx.insert(guideRelations).values(r.map((relatedGuideId) => ({ guideId: gid!, relatedGuideId })));
      }
      if (fd.has("__categories")) {
        await tx.delete(guideCategories).where(eq(guideCategories.guideId, gid));
        const c = ids(fd, "extraCategoryIds");
        if (c.length) await tx.insert(guideCategories).values(c.map((categoryId) => ({ guideId: gid!, categoryId })));
      }
      return gid;
    });

    await audit(user, "guide", guideId, id ? (status !== current ? `status:${status}` : "update") : "create", title);
    revalidatePublic();
    return success(status === "published" && current !== "published" ? "Published." : status === "review" ? "Sent to review." : "Saved.", {
      id: guideId,
      redirectTo: intent === "preview" ? `/admin/guides/${guideId}/preview` : !id ? `/admin/guides/${guideId}` : undefined,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function setGuideStatus(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  const status = str(fd, "status") as Status;
  if (!schema.guideStatus.enumValues.includes(status)) return;
  const db = getDb();
  const [g] = await db.select().from(guides).where(eq(guides.id, id));
  if (!g) return;
  if (status === "published" && (!g.excerpt || g.content.split(/\s+/).length < 150)) return;
  await db
    .update(guides)
    .set({ status, publishedAt: status === "published" ? (g.publishedAt ?? new Date()) : g.publishedAt, updatedAt: new Date() })
    .where(eq(guides.id, id));
  await audit(user, "guide", id, `status:${status}`, g.title);
  revalidatePublic();
}

export async function deleteGuide(fd: FormData) {
  const user = await assertUser("admin");
  const id = str(fd, "id");
  const db = getDb();
  const [g] = await db.select({ status: guides.status, title: guides.title }).from(guides).where(eq(guides.id, id));
  if (!g || g.status !== "archived") return;
  await db.delete(guides).where(eq(guides.id, id));
  await audit(user, "guide", id, "delete", g.title);
  revalidatePublic();
  redirect("/admin/guides");
}
