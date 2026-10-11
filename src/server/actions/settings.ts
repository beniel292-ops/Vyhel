"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { audit } from "@/lib/audit";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { assertUser, currentSessionId } from "@/lib/auth/session";
import { DEFAULT_SETTINGS, type ProblemCard, type SiteSettings } from "@/lib/settings-shape";
import { getSettings } from "@/lib/settings";
import { fail, handleError, revalidatePublic, str, success, validUrl, type ActionState } from "./utils";

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser("admin");
    const current = await getSettings();
    const errors: Record<string, string> = {};
    const s: SiteSettings = { ...DEFAULT_SETTINGS, ...current };
    const textKeys = [
      "siteName", "tagline", "description", "contactEmail", "instagramUrl", "youtubeUrl", "seoDefaultTitle",
      "seoDefaultDescription", "defaultOgImage", "affiliateDisclosure", "amazonAssociateId", "amazonMarketplace",
      "defaultCtaText", "googleAnalyticsId", "searchConsoleVerification", "legalName", "supportPhone", "businessAddress",
    ] as const;
    for (const k of textKeys) if (fd.has(k)) s[k] = str(fd, k);

    for (const k of ["instagramUrl", "youtubeUrl", "defaultOgImage"] as const) {
      if (s[k] && !validUrl(s[k], { httpsOnly: true, allowRelative: k === "defaultOgImage" })) errors[k] = "Use a full https:// URL.";
    }
    if (s.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contactEmail)) errors.contactEmail = "Enter a valid email.";
    if (s.googleAnalyticsId && !/^G-[A-Z0-9]+$/.test(s.googleAnalyticsId)) errors.googleAnalyticsId = "Looks like G-XXXXXXX.";
    if (s.amazonAssociateId && !/^[a-z0-9-]+$/i.test(s.amazonAssociateId)) errors.amazonAssociateId = "Letters, numbers and hyphens, e.g. vyhel-21.";
    if (!/as an amazon associate/i.test(s.affiliateDisclosure)) {
      errors.affiliateDisclosure = 'Amazon requires the statement "As an Amazon Associate I earn from qualifying purchases." (or equivalent).';
    }
    if (!s.siteName) errors.siteName = "Required.";
    if (s.supportPhone && !/^\+?[0-9][0-9 ()-]{6,20}$/.test(s.supportPhone)) errors.supportPhone = "Use digits, spaces and an optional +, e.g. +91 98765 43210.";
    // Razorpay review mode (docs/razorpay-review-mode.md): checkbox, only touched when its section was submitted.
    if (fd.has("__reviewMode")) s.reviewMode = fd.get("reviewMode") === "on";
    if (!s.defaultCtaText) s.defaultCtaText = DEFAULT_SETTINGS.defaultCtaText;

    if (fd.has("__problems")) {
      const problems: ProblemCard[] = [];
      for (let i = 0; i < 6; i++) {
        const title = str(fd, `problem_title_${i}`);
        const description = str(fd, `problem_description_${i}`);
        const href = str(fd, `problem_href_${i}`);
        if (!title) continue;
        if (!href.startsWith("/")) errors[`problem_href_${i}`] = "Use a site path like /collections/student-setup.";
        problems.push({ title, description, href });
      }
      s.problems = problems;
    }
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);

    await getDb()
      .insert(schema.siteSettings)
      .values({ key: "site", value: s })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: s, updatedAt: new Date() } });
    await audit(user, "settings", "site", "update");
    revalidatePublic();
    return success("Settings saved.");
  } catch (err) {
    return handleError(err);
  }
}

/** Removes every row created by the development seed (is_demo = true). */
export async function removeDemoData(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser("admin");
    if (str(fd, "confirm") !== "REMOVE") return fail('Type REMOVE to confirm.', { confirm: 'Type REMOVE to confirm.' });
    const db = getDb();
    const counts = await db.transaction(async (tx) => {
      const p = await tx.delete(schema.products).where(eq(schema.products.isDemo, true)).returning({ id: schema.products.id });
      const g = await tx.delete(schema.guides).where(eq(schema.guides.isDemo, true)).returning({ id: schema.guides.id });
      const c = await tx.delete(schema.collections).where(eq(schema.collections.isDemo, true)).returning({ id: schema.collections.id });
      // Demo categories are kept if real products now use them; just unflag them.
      await tx.update(schema.categories).set({ isDemo: false }).where(eq(schema.categories.isDemo, true));
      return { p: p.length, g: g.length, c: c.length };
    });
    await audit(user, "settings", null, "remove_demo_data", `${counts.p} products, ${counts.g} guides, ${counts.c} collections`);
    revalidatePublic();
    return success(`Removed ${counts.p} products, ${counts.g} guides and ${counts.c} collections.`);
  } catch (err) {
    return handleError(err);
  }
}

/* ------------------------------------------------------------------ users */

export async function createUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertUser("admin");
    const email = str(fd, "email").toLowerCase();
    const name = str(fd, "name");
    const role = str(fd, "role") === "admin" ? "admin" : "editor";
    const password = String(fd.get("password") ?? "");
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email.";
    const weak = validatePasswordStrength(password);
    if (weak) errors.password = weak;
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);
    const db = getDb();
    const [u] = await db.insert(schema.users).values({ email, name, role, passwordHash: await hashPassword(password) }).returning({ id: schema.users.id });
    await db.insert(schema.profiles).values({ userId: u.id, displayName: name });
    await audit(admin, "user", u.id, "create", `${email} (${role})`);
    return success(`${email} can now sign in. Share the temporary password privately.`);
  } catch (err) {
    return handleError(err);
  }
}

export async function updateUser(fd: FormData) {
  const admin = await assertUser("admin");
  const id = str(fd, "id");
  if (id === admin.id) return; // can't demote or disable yourself
  const role = str(fd, "role");
  const disabled = str(fd, "disabled");
  const db = getDb();
  const patch: Partial<typeof schema.users.$inferInsert> = { updatedAt: new Date() };
  if (role === "admin" || role === "editor") patch.role = role;
  if (disabled === "true" || disabled === "false") patch.disabled = disabled === "true";
  await db.update(schema.users).set(patch).where(eq(schema.users.id, id));
  if (patch.disabled) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  await audit(admin, "user", id, "update", JSON.stringify({ role: patch.role, disabled: patch.disabled }));
}

export async function changeOwnPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const currentPw = String(fd.get("currentPassword") ?? "");
    const next = String(fd.get("newPassword") ?? "");
    const db = getDb();
    const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    if (!row || !(await verifyPassword(currentPw, row.passwordHash))) return fail("Current password is incorrect.", { currentPassword: "Incorrect." });
    const weak = validatePasswordStrength(next);
    if (weak) return fail(weak, { newPassword: weak });
    await db.update(schema.users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(schema.users.id, user.id));
    // Sign out every other session for this account.
    const keep = await currentSessionId();
    await db
      .delete(schema.sessions)
      .where(keep ? and(eq(schema.sessions.userId, user.id), ne(schema.sessions.id, keep)) : eq(schema.sessions.userId, user.id));
    await audit(user, "user", user.id, "password_change");
    return success("Password updated. Other sessions were signed out.");
  } catch (err) {
    return handleError(err);
  }
}

export async function revokeAllSessions(fd: FormData) {
  const admin = await assertUser("admin");
  const ids = fd.getAll("userIds").map(String);
  if (!ids.length) return;
  await getDb().delete(schema.sessions).where(inArray(schema.sessions.userId, ids));
  await audit(admin, "user", null, "revoke_sessions", ids.join(","));
}
