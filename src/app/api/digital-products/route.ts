import { revalidatePath } from "next/cache";
import { isResponse, requireApiUser } from "@/lib/auth/api";
import { badRequest, json, readJson } from "@/lib/http";
import {
  adminListDigitalProducts,
  createDigitalProduct,
  DigitalProductError,
  listPublicDigitalProducts,
} from "@/server/services/digital-products";

/**
 * DIGITAL PRODUCTS (sold by Vyhel via Razorpay).
 * GET  /api/digital-products            → public catalogue (active products only, no file info)
 * GET  /api/digital-products?scope=admin → admin list incl. drafts, sales and revenue (auth)
 * POST /api/digital-products            → create (admin/editor)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("scope") === "admin") {
    const user = await requireApiUser(req);
    if (isResponse(user)) return user;
    const items = await adminListDigitalProducts({ q: url.searchParams.get("q") ?? undefined, status: url.searchParams.get("status") ?? undefined });
    return json({ items });
  }
  const items = await listPublicDigitalProducts();
  return json(
    { items: items.map((p) => ({ ...p, kind: "digital", purchase: "razorpay" })) },
    200,
    { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
  );
}

export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON object.");
  try {
    const product = await createDigitalProduct(user, body);
    revalidatePath("/", "layout");
    return json({ product }, 201);
  } catch (err) {
    if (err instanceof DigitalProductError) return json({ error: err.message, errors: err.errors }, err.status);
    throw err;
  }
}
