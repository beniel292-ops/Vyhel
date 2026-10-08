import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Public images (product photos, covers). Shared by the Media page (server action) and the
 * inline "Upload new image" in every image picker (/api/media).
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]; // no SVG: it can carry scripts

function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString().startsWith("ftypavi")) return "image/avif";
  if (buf.subarray(0, 3).toString() === "GIF") return "image/gif";
  return null;
}

function dimensions(buf: Buffer, mime: string): { width: number; height: number } | null {
  try {
    if (mime === "image/png") return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (mime === "image/gif") return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    if (mime === "image/webp") {
      const chunk = buf.subarray(12, 16).toString();
      if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    }
    if (mime === "image/jpeg") {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* unknown */
  }
  return null;
}

export type MediaUploadResult =
  | { ok: true; media: { id: string; url: string; alt: string; source: string; filename: string } }
  | { ok: false; message: string; errors: Record<string, string> };

export async function storeImageUpload(
  user: SessionUser,
  input: { file: FormDataEntryValue | null; alt: string; source: string; licenseNote: string | null; authorized: boolean },
): Promise<MediaUploadResult> {
  const errors: Record<string, string> = {};
  const file = input.file;
  if (!(file instanceof File) || file.size === 0) errors.file = "Choose an image.";
  if (!input.alt) errors.alt = "Describe the image for people using screen readers.";
  if (!input.source) errors.source = "Required — who made it or where it's licensed from.";
  if (!input.authorized) errors.authorized = "Confirm Vyhel has the right to use this image.";
  if (Object.keys(errors).length || !(file instanceof File)) return { ok: false, message: "Please fix the highlighted fields.", errors };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Images must be 5 MB or smaller.", errors: { file: "Max 5 MB." } };

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !ALLOWED.includes(mime)) return { ok: false, message: "Use a JPEG, PNG, WebP, AVIF or GIF image.", errors: { file: "Unsupported format." } };
  const dims = dimensions(buf, mime);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "image";
  const db = getDb();

  const row = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(schema.media)
      .values({
        filename: safeName,
        url: "pending",
        storage: process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "database",
        mimeType: mime,
        sizeBytes: buf.length,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        alt: input.alt,
        source: input.source,
        licenseNote: input.licenseNote,
        uploadedBy: user.id,
      })
      .returning({ id: schema.media.id });
    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(`media/${m.id}-${safeName}`, buf, { access: "public", contentType: mime });
      url = blob.url;
    } else {
      await tx.insert(schema.mediaBlobs).values({ mediaId: m.id, data: buf });
      url = `/media/${m.id}`;
    }
    await tx.update(schema.media).set({ url }).where(eq(schema.media.id, m.id));
    return { id: m.id, url };
  });
  await audit(user, "media", row.id, "upload", safeName);
  return { ok: true, media: { id: row.id, url: row.url, alt: input.alt, source: input.source, filename: safeName } };
}
