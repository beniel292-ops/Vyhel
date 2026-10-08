"use server";

import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/auth/session";
import { storeImageUpload } from "@/server/services/media";
import { fail, handleError, opt, str, success, type ActionState } from "./utils";

export async function uploadMedia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const r = await storeImageUpload(user, {
      file: fd.get("file"),
      alt: str(fd, "alt"),
      source: str(fd, "source"),
      licenseNote: opt(fd, "licenseNote"),
      authorized: bool(fd, "authorized"),
    });
    return r.ok ? success("Image uploaded.", { id: r.media.id }) : fail(r.message, r.errors);
  } catch (err) {
    return handleError(err);
  }
}

function bool(fd: FormData, k: string) {
  return fd.get(k) === "on";
}

export async function updateMedia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const id = str(fd, "id");
    const alt = str(fd, "alt");
    const source = str(fd, "source");
    if (!alt || !source) return fail("Alt text and source are required.");
    await getDb().update(schema.media).set({ alt, source, licenseNote: opt(fd, "licenseNote") }).where(eq(schema.media.id, id));
    await audit(user, "media", id, "update");
    return success("Saved.");
  } catch (err) {
    return handleError(err);
  }
}

export async function deleteMedia(fd: FormData) {
  const user = await assertUser();
  const id = str(fd, "id");
  const db = getDb();
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, id));
  if (!m) return;
  if (m.storage === "vercel-blob" && process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(m.url).catch(() => undefined);
  }
  await db.delete(schema.media).where(eq(schema.media.id, id));
  await audit(user, "media", id, "delete", m.filename);
}
