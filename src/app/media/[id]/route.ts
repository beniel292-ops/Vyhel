import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured, schema } from "@/db";

/** Serves images stored in Postgres (used when Vercel Blob isn't configured). Immutable per id. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const [row] = await getDb()
    .select({ data: schema.mediaBlobs.data, mime: schema.media.mimeType })
    .from(schema.mediaBlobs)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaBlobs.mediaId))
    .where(eq(schema.mediaBlobs.mediaId, id))
    .limit(1);
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      "content-type": row.mime,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
