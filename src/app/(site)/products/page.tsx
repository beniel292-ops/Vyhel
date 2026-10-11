import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/site/Cards";
import { FilterBar } from "@/components/site/FilterBar";
import { PageHeader } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { getBestForOptions, getCategoriesWithCounts, listProducts, PAGE_SIZE } from "@/server/queries/public";
import { notFoundInReviewMode } from "@/lib/review-mode";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse Vyhel's researched product picks by category, use case and editorial score.",
  alternates: { canonical: "/products" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  await notFoundInReviewMode(); // Razorpay review mode — docs/razorpay-review-mode.md
  const sp = await searchParams;
  const filters = {
    q: one(sp.q).slice(0, 80) || undefined,
    category: one(sp.category) || undefined,
    bestFor: one(sp.bestFor) || undefined,
    minScore: Number(one(sp.minScore)) || undefined,
    sort: (["score", "newest"].includes(one(sp.sort)) ? one(sp.sort) : "featured") as "featured" | "score" | "newest",
    page: Math.max(1, Number(one(sp.page)) || 1),
  };
  const [{ items, total }, categories, bestFor] = await Promise.all([
    listProducts(filters),
    getCategoriesWithCounts(),
    getBestForOptions(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v ? [[k, one(v)]] : [])));
    next.set("page", String(p));
    return `/products?${next.toString()}`;
  };

  return (
    <>
      <PageHeader eyebrow="Products" title="Find something worth buying." description="Every product here comes with an explanation: what it's good for, who it suits, and what to know before you buy." />
      <div className="container-page">
        <div className="border-y border-line py-6">
          <Suspense>
            <FilterBar
              total={total}
              categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
              bestFor={bestFor.map((b) => ({ value: b, label: b }))}
            />
          </Suspense>
        </div>
        <div className="pt-10">
          {items.length ? (
            <ProductGrid products={items} priorityCount={4} />
          ) : (
            <EmptyState
              title="No products here yet."
              description={filters.q || filters.category || filters.bestFor || filters.minScore ? "Try removing a filter or searching for something broader." : "New finds are being researched."}
              action={
                <Link href="/products" className={buttonClasses("secondary", "md")}>
                  View all products
                </Link>
              }
            />
          )}
        </div>
        {pages > 1 ? (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
            {filters.page > 1 ? (
              <Link href={pageHref(filters.page - 1)} className={buttonClasses("secondary", "md")}>
                Previous
              </Link>
            ) : null}
            <span className="px-3 text-sm text-muted">
              Page {filters.page} of {pages}
            </span>
            {filters.page < pages ? (
              <Link href={pageHref(filters.page + 1)} className={buttonClasses("secondary", "md")}>
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </>
  );
}
