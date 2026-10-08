import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/site/Logo";
import { isDatabaseConfigured } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; next?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/admin");
  const configured = isDatabaseConfigured();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Wordmark />
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">Admin</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          {sp.expired ? (
            <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">Your session expired. Please sign in again.</p>
          ) : null}
          {configured ? (
            <div className="mt-5">
              <LoginForm next={sp.next} />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The database isn&rsquo;t connected yet. Add <code className="rounded bg-sunken px-1">DATABASE_URL</code> to your
              environment, run the migrations, and create an admin with <code className="rounded bg-sunken px-1">npm run admin:create</code>.
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted">Admin accounts are created by an administrator.</p>
      </div>
    </main>
  );
}
