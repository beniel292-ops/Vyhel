import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { fileDownloadResponse } from "@/lib/storage/private-files";
import { checkDownloadToken } from "@/server/services/digital-orders";

/**
 * Secure download. token → (hash lookup) → order is PAID → token not expired/revoked/exhausted
 * → count one download → stream the file (database) or 60-second presigned redirect (S3/R2).
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limit = rateLimit(`download:${clientKey(req)}`, 30, 60_000);
  if (!limit.ok) return new NextResponse("Too many requests", { status: 429 });
  const check = await checkDownloadToken(token, { consume: true });
  if (!check.ok) {
    return NextResponse.redirect(new URL(`/download/${encodeURIComponent(token)}?error=${check.reason}`, req.url), 303);
  }
  return fileDownloadResponse(check.fileId);
}
