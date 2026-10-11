import type { Metadata } from "next";
import Link from "next/link";
import { GuideCard, ProductGrid } from "@/components/site/Cards";
import { PageHeader } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchIcon } from "@/components/ui/icons";
import { searchAll } from "@/server/queries/public";
import { notFoundInReviewMode } from "@/lib/review-mode";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  await notFoundInReviewMode(); // Razorpay review mode — docs/razorpay-review-mode.md
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const r = await searchAll(q, 12);
  const total = r.products.length + r.guides.length + r.collections.length + r.categories.length;

  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `Results for “${q}”` : "Search Vyhel"}>
        <form action="/search" method="get" role="search" className="relative mt-8 max-w-xl">
          <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products, guides, collections…"
            aria-label="Search"
            className="h-12 w-full rounded-md border border-line bg-surface pl-11 pr-4 text-[15px] focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
          />
        </form>
      </PageHeader>
      <div className="container-page space-y-16">
        {q.length >= 2 && total === 0 ? (
          <EmptyState title="Nothing matches yet." description="Try a broader word, or browse all products." action={<Link href="/products" className="text-sm font-medium underline underline-offset-4">Browse products</Link>} />
        ) : null}
        {r.categories.length || r.collections.length ? (
          <section>
            <h2 className="eyebrow mb-4">Categories & collections</h2>
            <ul className="flex flex-wrap gap-2">
              {r.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-sm hover:border-ink/40">
                    {c.name}
                  </Link>
                </li>
              ))}
              {r.collections.map((c) => (
                <li key={c.slug}>
                  <Link href={`/collections/${c.slug}`} className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-4 text-sm hover:border-ink/40">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {r.products.length ? (
          <section>
            <h2 className="eyebrow mb-6">Products</h2>
            <ProductGrid products={r.products} />
          </section>
        ) : null}
        {r.guides.length ? (
          <section>
            <h2 className="eyebrow mb-6">Guides</h2>
            <div className="grid gap-10 md:grid-cols-3">
              {r.guides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
