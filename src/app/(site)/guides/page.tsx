import type { Metadata } from "next";
import Link from "next/link";
import { GuideCard } from "@/components/site/Cards";
import { GUIDE_TYPE_LABELS, PageHeader } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getCategoriesWithCounts, listGuides } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Guides",
  description: "Buying guides, comparisons and problem-solving advice from Vyhel's editors.",
  alternates: { canonical: "/guides" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function GuidesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const [guides, categories] = await Promise.all([listGuides({ type, category }), getCategoriesWithCounts()]);

  const chips = [
    { label: "All", href: "/guides", active: !type && !category },
    ...Object.entries(GUIDE_TYPE_LABELS).map(([value, label]) => ({
      label: label === "Buying Guide" ? "Buying Guides" : label === "Comparison" ? "Comparisons" : label === "Product Review" ? "Product Reviews" : "Problem Solvers",
      href: `/guides?type=${value}`,
      active: type === value,
    })),
    ...categories.map((c) => ({
      label: c.slug === "college" ? "Student" : c.slug === "car-and-bike" ? "Car" : c.name,
      href: `/guides?category=${c.slug}`,
      active: category === c.slug,
    })),
  ];

  const [lead, ...rest] = guides;
  const filtered = Boolean(type || category);

  return (
    <>
      <PageHeader eyebrow="Guides" title="Read before you buy." description="Original, practical writing on what's worth buying, what to compare, and what to skip." />
      <div className="container-page">
        <nav aria-label="Guide filters" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {chips.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  aria-current={c.active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-[13px] transition-colors",
                    c.active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-ink/40",
                  )}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 border-t border-line pt-10">
          {!lead ? (
            <EmptyState title="New guides are on the way." description={filtered ? "Nothing in this section yet — try another filter." : undefined} />
          ) : filtered ? (
            <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
                <GuideCard guide={lead} variant="feature" />
                <div className="flex flex-col">
                  {rest.slice(0, 4).map((g) => (
                    <GuideCard key={g.id} guide={g} variant="compact" />
                  ))}
                </div>
              </div>
              {rest.length > 4 ? (
                <div className="mt-16 grid gap-x-8 gap-y-14 border-t border-line pt-14 md:grid-cols-2 lg:grid-cols-3">
                  {rest.slice(4).map((g) => (
                    <GuideCard key={g.id} guide={g} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
