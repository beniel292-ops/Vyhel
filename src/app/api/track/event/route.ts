import { NextResponse, type NextRequest } from "next/server";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { eventSchema, isBot } from "@/lib/analytics/server";

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured() || isBot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const d = parsed.data;
  if (d.path?.startsWith("/admin")) return new NextResponse(null, { status: 204 });
  try {
    await getDb().insert(schema.analyticsEvents).values({
      eventType: d.eventType,
      path: d.path ?? null,
      entityType: d.entityType ?? null,
      entityId: d.entityId ?? null,
      source: d.source || "direct",
      campaign: d.campaign ?? null,
      sessionId: d.sessionId ?? null,
      meta: d.meta ?? null,
    });
  } catch (err) {
    console.warn("[track/event]", (err as Error).message);
  }
  return new NextResponse(null, { status: 204 });
}
