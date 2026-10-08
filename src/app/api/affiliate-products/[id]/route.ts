import { revalidatePath } from "next/cache";
import { isResponse, requireApiUser } from "@/lib/auth/api";
import { badRequest, isUuid, json, readJson } from "@/lib/http";
import { AffiliateProductError, archiveAffiliateProduct, updateAffiliateProduct } from "@/server/services/affiliate-products";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Not found" }, 404);
  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON object.");
  try {
    const product = await updateAffiliateProduct(user, id, body);
    revalidatePath("/", "layout");
    return json({ product });
  } catch (err) {
    if (err instanceof AffiliateProductError) return json({ error: err.message, errors: err.errors }, err.status);
    throw err;
  }
}

/** Archives (soft-deletes) the affiliate product. */
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Not found" }, 404);
  try {
    const r = await archiveAffiliateProduct(user, id);
    revalidatePath("/", "layout");
    return json({ archived: true, id: r.id });
  } catch (err) {
    if (err instanceof AffiliateProductError) return json({ error: err.message }, err.status);
    throw err;
  }
}
