import Link from "next/link";
import type { ReactNode } from "react";
import { cn, formatDate } from "@/lib/utils";

/* Server-safe admin building blocks: headers, tables, pills, stat rows. */

export function AdminPageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-3 inline-block text-[13px] text-muted hover:text-ink">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="truncate text-[1.625rem] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  published: "bg-accent-soft text-accent-strong",
  active: "bg-accent-soft text-accent-strong",
  paid: "bg-accent-soft text-accent-strong",
  sent: "bg-accent-soft text-accent-strong",
  inactive: "bg-sunken text-ink-soft",
  created: "bg-sunken text-ink-soft",
  pending: "bg-warn-soft text-warn",
  failed: "bg-danger-soft text-danger",
  refunded: "bg-sunken text-ink-soft",
  verified: "bg-accent-soft text-accent-strong",
  draft: "bg-sunken text-ink-soft",
  review: "bg-warn-soft text-warn",
  unverified: "bg-warn-soft text-warn",
  archived: "bg-sunken text-faint",
  broken: "bg-danger-soft text-danger",
  missing: "bg-danger-soft text-danger",
  admin: "bg-ink text-white",
  editor: "bg-sunken text-ink-soft",
  disabled: "bg-danger-soft text-danger",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium capitalize", STATUS_TONES[status] ?? "bg-sunken text-ink-soft")}>
      {label ?? status}
    </span>
  );
}

export function DemoPill() {
  return <span className="rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">Demo</span>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-x-auto rounded-lg border border-line bg-surface", className)}>
      <table className="w-full min-w-[44rem] text-left text-[13.5px]">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted", className)}>
      {children}
    </th>
  );
}
export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("border-b border-line-soft px-4 py-3 align-middle text-ink-soft", className)}>
      {children}
    </td>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1.5 truncate text-[1.5rem] font-semibold tabular-nums tracking-[-0.02em] text-ink">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-muted">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg border border-line bg-surface px-4 py-3.5 transition-colors hover:border-ink/30">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">{body}</div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function NoData({ children = "No data yet. Your first clicks will appear here." }: { children?: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

export function When({ date }: { date: Date | null | undefined }) {
  if (!date) return <span className="text-faint">—</span>;
  return <time dateTime={date.toISOString()}>{formatDate(date)}</time>;
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2 text-sm">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="rounded-md border border-line bg-surface px-3 py-1.5 hover:border-ink/30">
          Previous
        </Link>
      ) : null}
      <span className="px-2 text-muted">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className="rounded-md border border-line bg-surface px-3 py-1.5 hover:border-ink/30">
          Next
        </Link>
      ) : null}
    </nav>
  );
}

/** GET filter form for list pages — no JS required. */
export function FilterForm({ children }: { children: ReactNode }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      <button type="submit" className="h-9 rounded-md border border-line bg-surface px-3 text-[13px] hover:border-ink/30">
        Apply
      </button>
    </form>
  );
}

/** Overflow menu for secondary row actions (no JS needed). */
export function RowMenu({ children }: { children: ReactNode }) {
  return (
    <details className="group relative inline-block text-left">
      <summary className="inline-flex cursor-pointer list-none items-center rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken [&::-webkit-details-marker]:hidden" aria-label="More actions">
        •••
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex w-36 flex-col items-stretch rounded-md border border-line bg-surface p-1 text-left shadow-lg [&_button]:w-full [&_button]:text-left [&_form]:block">
        {children}
      </div>
    </details>
  );
}
