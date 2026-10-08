import type { ReactNode } from "react";
import { formatDate } from "@/lib/utils";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl pb-8 pt-10 md:pt-16">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-4 text-[2.75rem] text-ink md:text-[3.75rem]">{title}</h1>
      {updated ? <p className="mt-4 text-sm text-muted">Last updated {formatDate(updated, { month: "long" })}</p> : null}
      <div className="prose-vyhel mt-10">{children}</div>
    </article>
  );
}
