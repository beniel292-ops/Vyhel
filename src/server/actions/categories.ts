"use server";

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { SLUG_RE, bool, fail, handleError, num, opt, revalidatePublic, str, success, validUrl, type ActionState } from "./utils";

const { categories, products } = schema;

export async function saveCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const id = opt(fd, "id");
    const errors: Record<string, string> = {};
    const name = str(fd, "name");
    if (!name) errors.name = "Required.";
    const slug = str(fd, "slug") || slugify(name);
    if (!SLUG_RE.test(slug)) errors.slug = "Lowercase letters, numbers and hyphens only.";
    const image = opt(fd, "image");
    if (!validUrl(image, { allowRelative: true })) errors.image = "Must be a valid URL.";
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);
    const sortOrder = num(fd, "sortOrder");
    const values = {
      name,
      slug,
      description: str(fd, "description"),
      image,
      imageAlt: opt(fd, "imageAlt"),
      seoTitle: opt(fd, "seoTitle"),
      seoDescription: opt(fd, "seoDescription"),
      featured: bool(fd, "featured"),
      sortOrder: sortOrder && !Number.isNaN(sortOrder) ? Math.round(sortOrder) : 0,
      updatedAt: new Date(),
    };
    const db = getDb();
    let cid = id;
    if (cid) await db.update(categories).set(values).where(eq(categories.id, cid));
    else cid = (await db.insert(categories).values(values).returning({ id: categories.id }))[0].id;
    await audit(user, "category", cid, id ? "update" : "create", name);
    revalidatePublic();
    return success(id ? "Category saved." : "Category created.", { id: cid, redirectTo: id ? undefined : "/admin/categories" });
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteCategory(fd: FormData) {
  const user = await assertUser("admin");
  const id = str(fd, "id");
  const db = getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(products).where(eq(products.categoryId, id));
  if (n > 0) return; // Never orphan products silently; the UI explains this.
  await db.delete(categories).where(eq(categories.id, id));
  await audit(user, "category", id, "delete");
  revalidatePublic();
}
