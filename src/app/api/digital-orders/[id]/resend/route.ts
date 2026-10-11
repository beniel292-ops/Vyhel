import { revalidatePath } from "next/cache";
import { isResponse, requireApiUser } from "@/lib/auth/api";
import { isUuid, json, readJson } from "@/lib/http";
import { CheckoutError, resendDelivery } from "@/server/services/digital-orders";

/** Admin only: resend the download email (optionally to a corrected address). Never creates an order. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser(req, "admin");
  if (isResponse(user)) return user;
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Not found" }, 404);
  const body = (await readJson(req, 2_000)) ?? {};
  try {
    const r = await resendDelivery(user, id, typeof body.email === "string" ? body.email : null);
    revalidatePath("/admin/orders");
    return json({ sent: r.sent, error: r.error ?? null }, r.sent ? 200 : r.skipped ? 409 : 502);
  } catch (err) {
    if (err instanceof CheckoutError) return json({ error: err.message }, err.status);
    throw err;
  }
}
