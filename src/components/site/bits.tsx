import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight } from "@/components/ui/icons";
import { cn, formatScore } from "@/lib/utils";

export const BADGE_LABELS = {
  editors_pick: "Editor's Pick",
  best_for_students: "Best for Students",
  best_for_cars: "Best for Cars",
  worth_considering: "Worth Considering",
} as const;

export const GUIDE_TYPE_LABELS = {
  buying_guide: "Buying Guide",
  comparison: "Comparison",
  review: "Product Review",
  problem_solver: "Problem Solver",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
        tone === "accent" && "bg-accent-soft text-accent-strong",
        tone === "neutral" && "bg-surface/90 text-ink-soft ring-1 ring-line",
        tone === "warn" && "bg-warn-soft text-warn",
      )}
    >
      {children}
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      title="Development example — not a verified recommendation"
      className={cn(
        "inline-flex items-center rounded-sm bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-warn",
        className,
      )}
    >
      Development example
    </span>
  );
}

export function ScoreBadge({ score, size = "sm" }: { score: number | null | undefined; size?: "sm" | "lg" }) {
  const value = formatScore(score);
  if (!value) return null;
  if (size === "lg") {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="display text-5xl text-ink">{value}</span>
        <span className="text-sm text-muted">/ 10</span>
      </div>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-0.5 text-[13px] tabular-nums text-ink" title="Vyhel editorial score">
      <span className="font-semibold">{value}</span>
      <span className="text-[11px] text-muted">/10</span>
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-10", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h2 className="display text-[2.125rem] text-ink md:text-[2.75rem]">{title}</h2>
        {description ? <p className="mt-3 text-[15px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          {hrefLabel}
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight size={12} className="text-faint" /> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-soft">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Disclosure({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("text-[13px] leading-relaxed text-muted", className)}>
      <span className="font-medium text-ink-soft">Disclosure:</span> {text}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="container-page pb-8 pt-10 md:pb-12 md:pt-16">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h1 className="display max-w-3xl text-[2.75rem] text-ink md:text-[4rem]">{title}</h1>
      {description ? <p className="mt-4 max-w-xl text-base leading-relaxed text-muted md:text-lg">{description}</p> : null}
      {children}
    </header>
  );
}
