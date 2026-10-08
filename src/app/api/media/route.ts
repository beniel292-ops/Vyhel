import { isResponse, requireApiUser } from "@/lib/auth/api";
import { json } from "@/lib/http";
import { storeImageUpload } from "@/server/services/media";

/** Admin: upload a public image (used by the inline "Upload new image" in image pickers). */
export async function POST(req: Request) {
  const user = await requireApiUser(req);
  if (isResponse(user)) return user;
  if (!(req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return json({ error: "Send multipart/form-data." }, 400);
  const fd = await req.formData().catch(() => null);
  if (!fd) return json({ error: "Upload failed — the file may be too large." }, 413);
  const r = await storeImageUpload(user, {
    file: fd.get("file"),
    alt: String(fd.get("alt") ?? "").trim(),
    source: String(fd.get("source") ?? "").trim(),
    licenseNote: String(fd.get("licenseNote") ?? "").trim() || null,
    authorized: fd.get("authorized") === "on" || fd.get("authorized") === "true",
  });
  return r.ok ? json({ media: r.media }, 201) : json({ error: r.message, errors: r.errors }, 400);
}
