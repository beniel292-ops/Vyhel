"use server";

import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { inspectAffiliateLink } from "@/lib/amazon";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { bool, fail, handleError, opt, revalidatePublic, str, success, validUrl, type ActionState } from "./utils";

const { affiliateLinks } = schema;
const STATUSES = schema.linkStatus.enumValues;

export async function saveAffiliateLink(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const settings = await getSettings();
    const id = opt(fd, "id");
    const productId = str(fd, "productId");
    const specialLink = str(fd, "specialLink");
    const errors: Record<string, string> = {};
    if (!/^[0-9a-f-]{36}$/i.test(productId)) errors.productId = "Choose a product.";
    const check = inspectAffiliateLink(specialLink, settings.amazonAssociateId || null);
    if (!specialLink) errors.specialLink = "Paste the Special Link.";
    else if (!check.ok) errors.specialLink = check.errors[0];
    const amazonUrl = opt(fd, "amazonUrl");
    if (!validUrl(amazonUrl, { httpsOnly: true })) errors.amazonUrl = "Must be an https:// URL.";
    const status = str(fd, "status") || "unverified";
    if (!(STATUSES as readonly string[]).includes(status)) errors.status = "Unknown status.";
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);

    const db = getDb();
    const isPrimary = bool(fd, "isPrimary");
    const values = {
      productId,
      merchant: str(fd, "merchant") || "amazon",
      label: opt(fd, "label"),
      specialLink,
      amazonUrl,
      asin: opt(fd, "asin")?.toUpperCase() ?? check.asin,
      associateTag: opt(fd, "associateTag") ?? check.tag,
      subTag: opt(fd, "subTag"),
      isSponsored: bool(fd, "isSponsored"),
      status: status as (typeof STATUSES)[number],
      notes: opt(fd, "notes"),
      isPrimary,
      updatedAt: new Date(),
    };
    const lid = await db.transaction(async (tx) => {
      if (isPrimary) {
        await tx
          .update(affiliateLinks)
          .set({ isPrimary: false })
          .where(and(eq(affiliateLinks.productId, productId), id ? ne(affiliateLinks.id, id) : undefined));
      }
      if (id) {
        await tx.update(affiliateLinks).set(values).where(eq(affiliateLinks.id, id));
        return id;
      }
      return (await tx.insert(affiliateLinks).values(values).returning({ id: affiliateLinks.id }))[0].id;
    });
    await audit(user, "affiliate_link", lid, id ? "update" : "create", specialLink);
    revalidatePublic();
    return success(
      check.warnings.length ? `Saved — note: ${check.warnings[0]}` : "Link saved.",
      { id: lid },
    );
  } catch (err) {
    return handleError(err);
  }
}

/** After opening the link and confirming it lands on the right Amazon page, the editor records the result. */
export async function markLinkChecked(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!(STATUSES as readonly string[]).includes(status)) return;
  await getDb()
    .update(affiliateLinks)
    .set({ status: status as (typeof STATUSES)[number], lastCheckedAt: new Date(), updatedAt: new Date() })
    .where(eq(affiliateLinks.id, id));
  await audit(user, "affiliate_link", id, `checked:${status}`);
  revalidatePublic();
}

export async function deleteAffiliateLink(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  await getDb().delete(affiliateLinks).where(eq(affiliateLinks.id, id));
  await audit(user, "affiliate_link", id, "delete");
  revalidatePublic();
}
