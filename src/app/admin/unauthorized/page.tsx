import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function Unauthorized() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="eyebrow">403 · Not allowed</p>
        <h1 className="display mt-3 text-4xl text-ink">That area is admin-only.</h1>
        <p className="mt-3 text-sm text-muted">Your account doesn&rsquo;t have permission for this page. Ask an admin if you need access.</p>
        <Link href="/admin" className={buttonClasses("primary", "md", "mt-6")}>Back to dashboard</Link>
      </div>
    </main>
  );
}
