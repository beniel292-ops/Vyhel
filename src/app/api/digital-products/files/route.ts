import { isResponse, requireApiUser } from "@/lib/auth/api";
import { audit } from "@/lib/audit";
import { badRequest, json, readJson } from "@/lib/http";
import { createS3Upload, mimeFor, registerS3File, saveFileToDatabase, storageDriver } from "@/lib/storage/private-files";

/**
 * Private deliverable uploads for DIGITAL products (admin only).
 * - database driver: multipart/form-data with `file`
 * - s3 driver: JSON { action: "presign", filename } → PUT to the returned URL → JSON { action: "register", key, filename }
 */
export async function GET(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  return json({ driver: storageDriver() });
}

export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.startsWith("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file");
      if (!(file instanceof File) || file.size === 0) return badRequest("Choose a file.");
      const mime = mimeFor(file.name);
      if (!mime) return badRequest("Unsupported file type. Use PDF, ZIP, EPUB, images, audio/video, Office or font files.");
      const saved = await saveFileToDatabase({ data: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: mime, uploadedBy: user.id });
      await audit(user, "digital_file", saved.id, "upload", saved.filename);
      return json({ file: { id: saved.id, filename: saved.filename, sizeBytes: saved.sizeBytes } }, 201);
    }
    const body = await readJson(req);
    if (!body) return badRequest("Send multipart/form-data or JSON.");
    const filename = String(body.filename ?? "");
    const mime = mimeFor(filename);
    if (!mime) return badRequest("Unsupported file type.");
    if (body.action === "presign") return json(await createS3Upload(filename));
    if (body.action === "register") {
      const saved = await registerS3File({ key: String(body.key ?? ""), filename, mimeType: mime, uploadedBy: user.id });
      await audit(user, "digital_file", saved.id, "upload", saved.filename);
      return json({ file: { id: saved.id, filename: saved.filename, sizeBytes: saved.sizeBytes } }, 201);
    }
    return badRequest("Unknown action.");
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Upload failed" }, 400);
  }
}
