import { revalidatePath } from "next/cache";
import { isResponse, requireApiUser } from "@/lib/auth/api";
import { badRequest, json, readJson } from "@/lib/http";
import {
  AffiliateProductError,
  adminListAffiliateProducts,
  createAffiliateProduct,
  listPublicAffiliateProducts,
} from "@/server/services/affiliate-products";

/**
 * AFFILIATE PRODUCTS (recommended by Vyhel, bought on the merchant's site).
 * There is deliberately no checkout, order or download endpoint for these.
 * GET  /api/affiliate-products             → published products with their external merchant link
 * GET  /api/affiliate-products?scope=admin → admin list (auth)
 * POST /api/affiliate-products             → create (admin/editor)
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("scope") === "admin") {
    const user = await requireApiUser(req);
    if (isResponse(user)) return user;
    return json({ items: await adminListAffiliateProducts(u.searchParams.get("q") ?? undefined) });
  }
  const items = await listPublicAffiliateProducts({ category: u.searchParams.get("category") ?? undefined, limit: Number(u.searchParams.get("limit")) || 60 });
  return json({ items }, 200, { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" });
}

export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON object.");
  try {
    const product = await createAffiliateProduct(user, body);
    revalidatePath("/", "layout");
    return json({ product }, 201);
  } catch (err) {
    if (err instanceof AffiliateProductError) return json({ error: err.message, errors: err.errors }, err.status);
    throw err;
  }
}
