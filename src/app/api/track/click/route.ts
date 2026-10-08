import { NextResponse, type NextRequest } from "next/server";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { clickSchema, isBot } from "@/lib/analytics/server";

/**
 * Records an affiliate click (aggregate only). Called via navigator.sendBeacon *alongside*
 * the user's navigation to Amazon — it never sits between the visitor and the merchant.
 * Stores no IP, user agent, cookie or user identifier.
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured() || isBot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = clickSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const d = parsed.data;
  try {
    await getDb().insert(schema.affiliateClicks).values({
      productId: d.productId,
      affiliateLinkId: d.linkId ?? null,
      placement: d.placement,
      pageType: d.pageType,
      pageId: d.pageId ?? null,
      pagePath: d.pagePath ?? null,
      source: d.source || "direct",
      campaign: d.campaign ?? null,
    });
  } catch (err) {
    // Unknown product ids (FK violation) or transient DB errors: ignore quietly.
    console.warn("[track/click]", (err as Error).message);
  }
  return new NextResponse(null, { status: 204 });
}
