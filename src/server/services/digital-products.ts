import "server-only";
import { and, asc, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { MAX_PRICE_MINOR, MIN_PRICE_MINOR, parseRupeesToMinor } from "@/lib/money";
import { slugify } from "@/lib/utils";

/**
 * DIGITAL PRODUCTS service — products Vyhel sells directly.
 * Shared by the admin UI (server actions) and the JSON API (/api/digital-products).
 * Has no knowledge of affiliate products, and affiliate code has no knowledge of this.
 */
const { digitalProducts, digitalOrders, digitalFiles } = schema;
type Status = (typeof schema.digitalProductStatus.enumValues)[number];
const STATUSES = schema.digitalProductStatus.enumValues;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export type DigitalProductInput = {
  name?: unknown;
  slug?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  /** Rupees, e.g. "499" or 499.5 */
  price?: unknown;
  /** Paise (alternative to `price`) */
  priceMinor?: unknown;
  imageUrl?: unknown;
  imageAlt?: unknown;
  fileId?: unknown;
  checkoutDescription?: unknown;
  whatsIncluded?: unknown;
  status?: unknown;
  featured?: unknown;
  sortOrder?: unknown;
};

type Values = Partial<typeof digitalProducts.$inferInsert>;
export type ValidationResult = { ok: true; values: Values } | { ok: false; errors: Record<string, string> };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : v == null ? "" : String(v).trim().slice(0, max));
const nullable = (v: unknown, max: number) => {
  const t = text(v, max);
  return t === "" ? null : t;
};

function validUrlOrPath(v: string | null) {
  if (!v) return true;
  if (v.startsWith("/")) return !v.startsWith("//");
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/** Validates a full create (partial=false) or a PATCH (partial=true). */
export function validateDigitalProduct(input: DigitalProductInput, partial: boolean): ValidationResult {
  const errors: Record<string, string> = {};
  const v: Values = {};
  const has = (k: keyof DigitalProductInput) => !partial || input[k] !== undefined;

  if (has("name")) {
    v.name = text(input.name, 160);
    if (!v.name) errors.name = "Give the product a name.";
  }
  if (has("slug") || (!partial && v.name)) {
    const s = text(input.slug, 80) || (v.name ? slugify(v.name) : "");
    // Only complain about the slug when there's something to derive it from.
    if (!SLUG_RE.test(s) && (s || v.name)) errors.slug = "Lowercase letters, numbers and hyphens only.";
    v.slug = s;
  }
  if (has("shortDescription")) v.shortDescription = text(input.shortDescription, 300);
  if (has("description")) v.description = text(input.description, 20000);
  if (input.price !== undefined || input.priceMinor !== undefined || !partial) {
    let minor: number | null = null;
    if (input.priceMinor !== undefined && input.priceMinor !== null && input.priceMinor !== "") {
      minor = Number.isInteger(Number(input.priceMinor)) ? Number(input.priceMinor) : null;
    } else if (input.price !== undefined && input.price !== null && input.price !== "") {
      minor = parseRupeesToMinor(String(input.price));
    }
    if (minor === null) errors.price = "Enter a price in rupees, e.g. 499.";
    else if (minor < MIN_PRICE_MINOR || minor > MAX_PRICE_MINOR) errors.price = "Price must be between ₹1 and ₹5,00,000.";
    else v.priceMinor = minor;
  }
  if (has("imageUrl")) {
    v.imageUrl = nullable(input.imageUrl, 1000);
    if (!validUrlOrPath(v.imageUrl)) errors.imageUrl = "Use an https:// URL or a media-library path.";
  }
  if (has("imageAlt")) v.imageAlt = nullable(input.imageAlt, 300);
  if (has("fileId")) {
    v.fileId = nullable(input.fileId, 40);
    if (v.fileId && !/^[0-9a-f-]{36}$/i.test(v.fileId)) errors.fileId = "Invalid file reference.";
  }
  if (has("checkoutDescription")) v.checkoutDescription = nullable(input.checkoutDescription, 255);
  if (has("whatsIncluded")) {
    const list = Array.isArray(input.whatsIncluded)
      ? input.whatsIncluded
      : String(input.whatsIncluded ?? "")
          .split("\n");
    v.whatsIncluded = list.map((x) => String(x).trim().slice(0, 200)).filter(Boolean).slice(0, 20);
  }
  if (has("status")) {
    const s = text(input.status, 20) || "draft";
    if (!(STATUSES as readonly string[]).includes(s)) errors.status = "Unknown status.";
    else v.status = s as Status;
  }
  if (has("featured")) v.featured = input.featured === true || input.featured === "on" || input.featured === "true";
  if (has("sortOrder")) {
    const n = Number(input.sortOrder ?? 0);
    v.sortOrder = Number.isFinite(n) ? Math.round(n) : 0;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values: v };
}

/** Rules that need the database: unique slug, file exists, and "active" requires a deliverable. */
async function checkRules(values: Values, id: string | null): Promise<Record<string, string>> {
  const db = getDb();
  const errors: Record<string, string> = {};
  if (values.slug) {
    const [clash] = await db
      .select({ id: digitalProducts.id })
      .from(digitalProducts)
      .where(and(eq(digitalProducts.slug, values.slug), id ? ne(digitalProducts.id, id) : undefined));
    if (clash) errors.slug = "Already used by another digital product.";
  }
  let fileId = values.fileId;
  if (fileId === undefined && id) {
    const [row] = await db.select({ fileId: digitalProducts.fileId }).from(digitalProducts).where(eq(digitalProducts.id, id));
    fileId = row?.fileId ?? null;
  }
  if (fileId) {
    const [f] = await db.select({ id: digitalFiles.id }).from(digitalFiles).where(eq(digitalFiles.id, fileId));
    if (!f) errors.fileId = "That file no longer exists.";
  }
  if (values.status === "active" && !fileId) errors.fileId = "Upload the deliverable file before activating.";
  return errors;
}

export class DigitalProductError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string> = {},
    public status = 400,
  ) {
    super(message);
  }
}

export async function createDigitalProduct(user: SessionUser, input: DigitalProductInput) {
  const v = validateDigitalProduct(input, false);
  if (!v.ok) throw new DigitalProductError("Please fix the highlighted fields.", v.errors);
  const ruleErrors = await checkRules(v.values, null);
  if (Object.keys(ruleErrors).length) throw new DigitalProductError("Please fix the highlighted fields.", ruleErrors);
  const [row] = await getDb()
    .insert(digitalProducts)
    .values({ ...(v.values as typeof digitalProducts.$inferInsert), createdBy: user.id })
    .returning();
  await audit(user, "digital_product", row.id, "create", row.name);
  return row;
}

export async function updateDigitalProduct(user: SessionUser, id: string, input: DigitalProductInput) {
  const db = getDb();
  const [existing] = await db.select().from(digitalProducts).where(eq(digitalProducts.id, id));
  if (!existing) throw new DigitalProductError("Digital product not found.", {}, 404);
  const v = validateDigitalProduct(input, true);
  if (!v.ok) throw new DigitalProductError("Please fix the highlighted fields.", v.errors);
  const merged = { ...v.values, status: v.values.status ?? existing.status };
  const ruleErrors = await checkRules(merged, id);
  if (Object.keys(ruleErrors).length) throw new DigitalProductError("Please fix the highlighted fields.", ruleErrors);
  const [row] = await db
    .update(digitalProducts)
    .set({ ...v.values, updatedAt: new Date() })
    .where(eq(digitalProducts.id, id))
    .returning();
  await audit(user, "digital_product", id, v.values.status && v.values.status !== existing.status ? `status:${v.values.status}` : "update", row.name);
  return row;
}

/** Hard delete only when there are no orders; otherwise archive (orders must stay intact). */
export async function deleteOrArchiveDigitalProduct(user: SessionUser, id: string) {
  const db = getDb();
  const [existing] = await db.select().from(digitalProducts).where(eq(digitalProducts.id, id));
  if (!existing) throw new DigitalProductError("Digital product not found.", {}, 404);
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(digitalOrders).where(eq(digitalOrders.productId, id));
  if (n > 0) {
    await db.update(digitalProducts).set({ status: "archived", updatedAt: new Date() }).where(eq(digitalProducts.id, id));
    await audit(user, "digital_product", id, "status:archived", `${existing.name} (has ${n} orders, archived instead of deleted)`);
    return { archived: true, deleted: false };
  }
  await db.delete(digitalProducts).where(eq(digitalProducts.id, id));
  await audit(user, "digital_product", id, "delete", existing.name);
  return { archived: false, deleted: true };
}

/* ---------------------------------------------------------------- reads */

/** Public shape: never includes file references or internal ids beyond the product id. */
export type PublicDigitalProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  priceMinor: number;
  currency: string;
  imageUrl: string | null;
  imageAlt: string | null;
  whatsIncluded: string[];
  featured: boolean;
};

const publicSelect = {
  id: digitalProducts.id,
  slug: digitalProducts.slug,
  name: digitalProducts.name,
  shortDescription: digitalProducts.shortDescription,
  description: digitalProducts.description,
  priceMinor: digitalProducts.priceMinor,
  currency: digitalProducts.currency,
  imageUrl: digitalProducts.imageUrl,
  imageAlt: digitalProducts.imageAlt,
  whatsIncluded: digitalProducts.whatsIncluded,
  featured: digitalProducts.featured,
};

/** "Purchasable" = active AND has a deliverable file. */
const purchasable = and(eq(digitalProducts.status, "active"), sql`${digitalProducts.fileId} is not null`);

export async function listPublicDigitalProducts(limit = 60): Promise<PublicDigitalProduct[]> {
  if (!isDatabaseConfigured()) return [];
  return getDb()
    .select(publicSelect)
    .from(digitalProducts)
    .where(purchasable)
    .orderBy(desc(digitalProducts.featured), asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt))
    .limit(limit);
}

export async function getPublicDigitalProduct(slug: string): Promise<PublicDigitalProduct | null> {
  if (!isDatabaseConfigured()) return null;
  const [row] = await getDb()
    .select(publicSelect)
    .from(digitalProducts)
    .where(and(eq(digitalProducts.slug, slug), purchasable))
    .limit(1);
  return row ?? null;
}

export async function adminListDigitalProducts(f: { q?: string; status?: string } = {}) {
  const where: SQL[] = [];
  if (f.q) where.push(or(ilike(digitalProducts.name, `%${f.q}%`), ilike(digitalProducts.slug, `%${f.q}%`))!);
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) where.push(eq(digitalProducts.status, f.status as Status));
  else where.push(ne(digitalProducts.status, "archived"));
  return getDb()
    .select({
      id: digitalProducts.id,
      name: digitalProducts.name,
      slug: digitalProducts.slug,
      status: digitalProducts.status,
      priceMinor: digitalProducts.priceMinor,
      currency: digitalProducts.currency,
      fileId: digitalProducts.fileId,
      fileName: digitalFiles.filename,
      createdAt: digitalProducts.createdAt,
      updatedAt: digitalProducts.updatedAt,
      sales: sql<number>`(select count(*) from digital_orders o where o.product_id = ${digitalProducts.id} and o.payment_status = 'paid')`.mapWith(Number),
      revenueMinor: sql<number>`(select coalesce(sum(o.amount_minor), 0) from digital_orders o where o.product_id = ${digitalProducts.id} and o.payment_status = 'paid')`.mapWith(Number),
    })
    .from(digitalProducts)
    .leftJoin(digitalFiles, eq(digitalFiles.id, digitalProducts.fileId))
    .where(and(...where))
    .orderBy(asc(digitalProducts.sortOrder), desc(digitalProducts.createdAt));
}

export async function adminGetDigitalProduct(id: string) {
  const [row] = await getDb()
    .select({ product: digitalProducts, file: digitalFiles })
    .from(digitalProducts)
    .leftJoin(digitalFiles, eq(digitalFiles.id, digitalProducts.fileId))
    .where(eq(digitalProducts.id, id));
  return row ?? null;
}
