"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { fail, type ActionState } from "./utils";

const MAX_FAILURES = 5;
const WINDOW_MIN = 15;

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isDatabaseConfigured()) return fail("The database isn't configured yet. Set DATABASE_URL first.");
  const email = String(fd.get("email") ?? "").toLowerCase().trim().slice(0, 200);
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return fail("Enter your email and password.");

  const db = getDb();
  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000);
  const [{ failures }] = await db
    .select({ failures: sql<number>`count(*)`.mapWith(Number) })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, email), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.attemptedAt, since)));
  if (failures >= MAX_FAILURES) {
    return fail(`Too many attempts. Please wait ${WINDOW_MIN} minutes and try again.`);
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(
    password,
    user?.passwordHash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  );
  await db.insert(schema.loginAttempts).values({ email, success: Boolean(user && ok && !user.disabled) });
  if (!user || !ok || user.disabled) return fail("That email and password don't match an active account.");

  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await createSession(user.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
