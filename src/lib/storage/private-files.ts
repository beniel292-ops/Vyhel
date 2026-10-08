import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * Private storage for paid digital files. Files are NEVER placed in /public or behind a permanent URL.
 *
 * Drivers
 * - "database" (default, zero setup): bytes live in Postgres (`digital_file_blobs`) and are streamed by
 *   /api/downloads/[token] after authorisation. Fine for PDFs/templates/small zips. On Vercel, uploads
 *   through the admin are limited by the ~4.5 MB request-body cap.
 * - "s3" (optional): any S3-compatible private bucket (Cloudflare R2, AWS S3, Backblaze B2…). The admin
 *   uploads straight to the bucket with a short-lived presigned PUT, and buyers get a 60-second presigned
 *   GET after authorisation. Enable by setting S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 */
export const MAX_DB_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_S3_FILE_BYTES = 2 * 1024 * 1024 * 1024;

export const ALLOWED_DIGITAL_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  zip: "application/zip",
  epub: "application/epub+zip",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  psd: "image/vnd.adobe.photoshop",
  fig: "application/octet-stream",
  sketch: "application/octet-stream",
  ttf: "font/ttf",
  otf: "font/otf",
  woff2: "font/woff2",
};

export function safeFilename(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 140);
  return cleaned || "download";
}

export function mimeFor(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_DIGITAL_TYPES[ext] ?? null;
}

type S3Cfg = { endpoint: string; bucket: string; region: string; client: AwsClient };

function s3(): S3Cfg | null {
  const endpoint = process.env.S3_ENDPOINT?.trim().replace(/\/$/, "");
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  const region = process.env.S3_REGION?.trim() || "auto";
  return { endpoint, bucket, region, client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region }) };
}

export function storageDriver(): "s3" | "database" {
  return s3() ? "s3" : "database";
}

const objectUrl = (c: S3Cfg, key: string) =>
  `${c.endpoint}/${c.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function presign(c: S3Cfg, method: "GET" | "PUT" | "HEAD", key: string, expiresSeconds: number, extra: Record<string, string> = {}) {
  const url = new URL(objectUrl(c, key));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const signed = await c.client.sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

/** Store an uploaded file in Postgres. */
export async function saveFileToDatabase(input: { data: Buffer; filename: string; mimeType: string; uploadedBy: string }) {
  if (input.data.length > MAX_DB_FILE_BYTES) throw new Error("File is larger than 25 MB. Configure S3/R2 storage for big files.");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [file] = await tx
      .insert(schema.digitalFiles)
      .values({
        filename: safeFilename(input.filename),
        mimeType: input.mimeType,
        sizeBytes: input.data.length,
        sha256: createHash("sha256").update(input.data).digest("hex"),
        storage: "database",
        uploadedBy: input.uploadedBy,
      })
      .returning();
    await tx.insert(schema.digitalFileBlobs).values({ fileId: file.id, data: input.data });
    return file;
  });
}

/** Step 1 of a direct-to-bucket upload: a 10-minute presigned PUT for a fresh, unguessable key. */
export async function createS3Upload(filename: string) {
  const c = s3();
  if (!c) throw new Error("S3 storage is not configured.");
  const key = `digital/${randomUUID()}/${safeFilename(filename)}`;
  return { key, url: await presign(c, "PUT", key, 600) };
}

/** Step 2: confirm the object exists, then record it. */
export async function registerS3File(input: { key: string; filename: string; mimeType: string; uploadedBy: string }) {
  const c = s3();
  if (!c) throw new Error("S3 storage is not configured.");
  if (!/^digital\/[0-9a-f-]{36}\/[\w.\- ]+$/.test(input.key)) throw new Error("Invalid storage key.");
  const head = await fetch(await presign(c, "HEAD", input.key, 60), { method: "HEAD" });
  if (!head.ok) throw new Error("Upload not found in the bucket. Please try again.");
  const size = Number(head.headers.get("content-length") ?? 0);
  if (size > MAX_S3_FILE_BYTES) throw new Error("File is too large.");
  const [file] = await getDb()
    .insert(schema.digitalFiles)
    .values({
      filename: safeFilename(input.filename),
      mimeType: input.mimeType,
      sizeBytes: size,
      storage: "s3",
      storageKey: input.key,
      uploadedBy: input.uploadedBy,
    })
    .returning();
  return file;
}

/** Build the response for an already-authorised download. Never call this without checking the token. */
export async function fileDownloadResponse(fileId: string): Promise<Response> {
  const db = getDb();
  const [file] = await db.select().from(schema.digitalFiles).where(eq(schema.digitalFiles.id, fileId));
  if (!file) return new Response("File missing", { status: 404 });
  const disposition = `attachment; filename="${file.filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`;
  const common = {
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
  if (file.storage === "s3" && file.storageKey) {
    const c = s3();
    if (!c) return new Response("Storage unavailable", { status: 503 });
    const url = await presign(c, "GET", file.storageKey, 60, { "response-content-disposition": disposition });
    return new Response(null, { status: 302, headers: { ...common, location: url } });
  }
  const [blob] = await db.select({ data: schema.digitalFileBlobs.data }).from(schema.digitalFileBlobs).where(eq(schema.digitalFileBlobs.fileId, fileId));
  if (!blob) return new Response("File missing", { status: 404 });
  return new Response(new Uint8Array(blob.data), {
    headers: { ...common, "content-type": file.mimeType, "content-length": String(blob.data.length), "content-disposition": disposition },
  });
}
