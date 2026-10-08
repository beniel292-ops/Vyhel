"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { SLUG_RE, bool, fail, handleError, ids, num, opt, revalidatePublic, str, success, validUrl, type ActionState } from "./utils";

const { collections, collectionProducts, collectionGuides } = schema;
type Status = (typeof schema.collectionStatus.enumValues)[number];

export async function saveCollection(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const db = getDb();
    const id = opt(fd, "id");
    const intent = str(fd, "intent") || "save";
    const errors: Record<string, string> = {};
    const name = str(fd, "name");
    if (!name) errors.name = "Give the collection a name.";
    const slug = str(fd, "slug") || slugify(name);
    if (!SLUG_RE.test(slug)) errors.slug = "Lowercase letters, numbers and hyphens only.";
    const heroImage = opt(fd, "heroImage");
    if (!validUrl(heroImage, { allowRelative: true })) errors.heroImage = "Must be a valid URL.";
    const sortOrder = num(fd, "sortOrder");
    const productIds = ids(fd, "productIds");

    let current: Status = "draft";
    if (id) {
      const [row] = await db.select({ status: collections.status }).from(collections).where(eq(collections.id, id));
      if (!row) return fail("This collection no longer exists.");
      current = row.status;
    }
    const map: Record<string, Status> = { publish: "published", draft: "draft", archive: "archived" };
    const status = map[intent] ?? current;
    if (status === "published" && productIds.length === 0) errors.productIds = "Add at least one product before publishing.";
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);

    const values = {
      name,
      slug,
      tagline: opt(fd, "tagline"),
      description: str(fd, "description"),
      intro: opt(fd, "intro"),
      heroImage,
      heroImageAlt: opt(fd, "heroImageAlt"),
      seoTitle: opt(fd, "seoTitle"),
      seoDescription: opt(fd, "seoDescription"),
      featured: bool(fd, "featured"),
      sortOrder: sortOrder && !Number.isNaN(sortOrder) ? Math.round(sortOrder) : 0,
      status,
      updatedAt: new Date(),
    };
    const notes = new Map(productIds.map((pid) => [pid, opt(fd, `note_${pid}`)]));

    const cid = await db.transaction(async (tx) => {
      let cid = id;
      if (cid) await tx.update(collections).set(values).where(eq(collections.id, cid));
      else cid = (await tx.insert(collections).values(values).returning({ id: collections.id }))[0].id;
      await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, cid));
      if (productIds.length)
        await tx
          .insert(collectionProducts)
          .values(productIds.map((productId, i) => ({ collectionId: cid!, productId, sortOrder: i, note: notes.get(productId) ?? null })));
      await tx.delete(collectionGuides).where(eq(collectionGuides.collectionId, cid));
      const g = ids(fd, "guideIds");
      if (g.length) await tx.insert(collectionGuides).values(g.map((guideId) => ({ collectionId: cid!, guideId })));
      return cid;
    });
    await audit(user, "collection", cid, id ? (status !== current ? `status:${status}` : "update") : "create", name);
    revalidatePublic();
    return success(status === "published" && current !== "published" ? "Published." : "Saved.", {
      id: cid,
      redirectTo: intent === "preview" ? `/admin/collections/${cid}/preview` : !id ? `/admin/collections/${cid}` : undefined,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function setCollectionStatus(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  const status = str(fd, "status") as Status;
  if (!schema.collectionStatus.enumValues.includes(status)) return;
  await getDb().update(collections).set({ status, updatedAt: new Date() }).where(eq(collections.id, id));
  await audit(user, "collection", id, `status:${status}`);
  revalidatePublic();
}

export async function deleteCollection(fd: FormData) {
  const user = await assertUser("admin");
  const id = str(fd, "id");
  await getDb().delete(collections).where(eq(collections.id, id));
  await audit(user, "collection", id, "delete");
  revalidatePublic();
  redirect("/admin/collections");
}
