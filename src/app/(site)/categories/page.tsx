import type { Metadata } from "next";
import { CategoryCard } from "@/components/site/Cards";
import { PageHeader } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCategoriesWithCounts } from "@/server/queries/public";
import { notFoundInReviewMode } from "@/lib/review-mode";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Categories",
  description: "Browse Vyhel's product research by category.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  await notFoundInReviewMode(); // Razorpay review mode — docs/razorpay-review-mode.md
  const categories = await getCategoriesWithCounts();
  return (
    <>
      <PageHeader eyebrow="Categories" title="Browse by category." description="Every category is a starting point. Each product inside explains what it's good for and who should skip it." />
      <div className="container-page">
        {categories.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="Categories are on the way." />
        )}
      </div>
    </>
  );
}
