import { revalidatePath } from "next/cache";
import { isResponse, requireApiUser } from "@/lib/auth/api";
import { badRequest, isUuid, json, readJson } from "@/lib/http";
import {
  adminGetDigitalProduct,
  deleteOrArchiveDigitalProduct,
  DigitalProductError,
  getPublicDigitalProduct,
  updateDigitalProduct,
} from "@/server/services/digital-products";

type Ctx = { params: Promise<{ id: string }> };

/** GET by slug (public, active only) or by id (admin). */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (isUuid(id)) {
    const user = await requireApiUser(req);
    if (isResponse(user)) return user;
    const row = await adminGetDigitalProduct(id);
    if (!row) return json({ error: "Not found" }, 404);
    return json({ product: row.product, file: row.file ? { id: row.file.id, filename: row.file.filename, sizeBytes: row.file.sizeBytes, mimeType: row.file.mimeType } : null });
  }
  const product = await getPublicDigitalProduct(id);
  if (!product) return json({ error: "Not found" }, 404);
  return json({ product: { ...product, kind: "digital", purchase: "razorpay" } });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Not found" }, 404);
  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON object.");
  try {
    const product = await updateDigitalProduct(user, id, body);
    revalidatePath("/", "layout");
    return json({ product });
  } catch (err) {
    if (err instanceof DigitalProductError) return json({ error: err.message, errors: err.errors }, err.status);
    throw err;
  }
}

/** Deletes a product with no orders; archives it otherwise (orders are never orphaned). */
export async function DELETE(req: Request, { params }: Ctx) {
  const user = await requireApiUser(req, "admin");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Not found" }, 404);
  try {
    const r = await deleteOrArchiveDigitalProduct(user, id);
    revalidatePath("/", "layout");
    return json(r);
  } catch (err) {
    if (err instanceof DigitalProductError) return json({ error: err.message }, err.status);
    throw err;
  }
}
