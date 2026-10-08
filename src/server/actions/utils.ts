import "server-only";
import { revalidatePath } from "next/cache";
import { AuthError } from "@/lib/auth/session";

import type { ActionState } from "@/lib/action-state";
export type { ActionState };

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const opt = (fd: FormData, key: string) => {
  const v = str(fd, key);
  return v === "" ? null : v;
};
export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const num = (fd: FormData, key: string) => {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
export const ids = (fd: FormData, key: string) =>
  fd
    .getAll(key)
    .map(String)
    .filter((v) => /^[0-9a-f-]{36}$/i.test(v));

export function fail(message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors, nonce: Date.now() };
}
export function success(message: string, extra: Partial<ActionState> = {}): ActionState {
  return { ok: true, message, nonce: Date.now(), ...extra };
}

/** Public pages are ISR-cached; any content change refreshes them immediately. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}

export function handleError(err: unknown): ActionState {
  if (err instanceof AuthError) return fail(err.message);
  const msg = err instanceof Error ? err.message : String(err);
  if (/unique|duplicate key/i.test(msg)) {
    if (/slug/i.test(msg)) return fail("That slug is already in use.", { slug: "Already in use — choose another." });
    if (/email/i.test(msg)) return fail("That email is already registered.", { email: "Already registered." });
    return fail("That value is already in use.");
  }
  if (/check constraint/i.test(msg) && /slug/i.test(msg)) {
    return fail("Slugs can only use lowercase letters, numbers and hyphens.", { slug: "Lowercase letters, numbers and hyphens only." });
  }
  console.error("[admin action]", err);
  return fail("Something went wrong saving that. Please try again.");
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validUrl(v: string | null, opts: { httpsOnly?: boolean; allowRelative?: boolean } = {}) {
  if (!v) return true;
  if (opts.allowRelative && v.startsWith("/")) return true;
  try {
    const u = new URL(v);
    return opts.httpsOnly ? u.protocol === "https:" : u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
