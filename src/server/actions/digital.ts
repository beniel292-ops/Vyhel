"use server";

import { redirect } from "next/navigation";
import { assertUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { mimeFor, saveFileToDatabase } from "@/lib/storage/private-files";
import {
  createDigitalProduct,
  deleteOrArchiveDigitalProduct,
  DigitalProductError,
  updateDigitalProduct,
} from "@/server/services/digital-products";
import { CheckoutError, resendDelivery } from "@/server/services/digital-orders";
import { fail, handleError, opt, revalidatePublic, str, success, type ActionState } from "./utils";

/** Admin server actions for DIGITAL products & orders. Thin wrappers around the services. */

function formToInput(fd: FormData) {
  return {
    name: fd.get("name"),
    slug: fd.get("slug"),
    shortDescription: fd.get("shortDescription"),
    description: fd.get("description"),
    price: fd.get("price"),
    imageUrl: fd.get("imageUrl"),
    imageAlt: fd.get("imageAlt"),
    fileId: fd.get("fileId"),
    checkoutDescription: fd.get("checkoutDescription"),
    whatsIncluded: fd.get("whatsIncluded"),
    featured: fd.get("featured") === "on",
    sortOrder: fd.get("sortOrder"),
  };
}

export async function saveDigitalProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const id = opt(fd, "id");
    const intent = str(fd, "intent") || "save";
    const input: Record<string, unknown> = formToInput(fd);
    const statusFor: Record<string, string> = { activate: "active", deactivate: "inactive", draft: "draft", archive: "archived" };
    if (statusFor[intent]) input.status = statusFor[intent];
    else if (!id) input.status = "draft";
    const row = id ? await updateDigitalProduct(user, id, input) : await createDigitalProduct(user, input);
    revalidatePublic();
    const msg = intent === "activate" ? "Live — customers can buy it now." : intent === "deactivate" ? "Deactivated — no longer for sale." : intent === "archive" ? "Archived." : "Saved.";
    return success(msg, { id: row.id, redirectTo: id ? undefined : `/admin/digital-products/${row.id}` });
  } catch (err) {
    if (err instanceof DigitalProductError) return fail(err.message, err.errors);
    return handleError(err);
  }
}

export async function setDigitalProductStatus(fd: FormData) {
  const user = await assertUser();
  const status = str(fd, "status");
  if (!["active", "inactive", "draft", "archived"].includes(status)) return;
  try {
    await updateDigitalProduct(user, str(fd, "id"), { status });
  } catch (err) {
    if (!(err instanceof DigitalProductError)) throw err;
    // e.g. activating without a file — the list shows the reason ("No file").
  }
  revalidatePublic();
}

export async function removeDigitalProduct(fd: FormData) {
  const user = await assertUser("admin");
  await deleteOrArchiveDigitalProduct(user, str(fd, "id"));
  revalidatePublic();
  redirect("/admin/digital-products");
}

/** Upload the private deliverable (database storage). Returns the new file id for the form. */
export async function uploadDigitalFile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a file.", { file: "Choose a file." });
    const mime = mimeFor(file.name);
    if (!mime) return fail("Unsupported file type.", { file: "Use PDF, ZIP, EPUB, images, audio/video, Office or font files." });
    const saved = await saveFileToDatabase({ data: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: mime, uploadedBy: user.id });
    await audit(user, "digital_file", saved.id, "upload", saved.filename);
    return success(`Uploaded ${saved.filename}.`, { id: saved.id });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Upload failed.");
  }
}

export async function resendOrderEmail(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser("admin");
    const r = await resendDelivery(user, str(fd, "id"), opt(fd, "email"));
    return r.sent ? success("Download email sent.") : fail(`Email failed: ${r.error ?? "unknown error"}. Check RESEND_API_KEY / EMAIL_FROM.`);
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message, err.field ? { [err.field]: err.message } : undefined);
    return handleError(err);
  }
}
