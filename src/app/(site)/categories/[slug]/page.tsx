import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/site/Analytics";
import { GuideCard, ProductGrid } from "@/components/site/Cards";
import { Breadcrumbs } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { JsonLd, breadcrumbLd } from "@/lib/jsonld";
import { absoluteUrl } from "@/lib/utils";
import { getCategoryBySlug } from "@/server/queries/public";

export const revalidate = 300;

/** Render on first request, then cache (ISR). Admin edits revalidate immediately. */
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getCategoryBySlug(slug);
  if (!d) return { title: "Category not found", robots: { index: false } };
  return {
    title: d.category.seoTitle || `${d.category.name} — useful products, explained`,
    description: d.category.seoDescription || d.category.description,
    alternates: { canonical: `/categories/${d.category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const d = await getCategoryBySlug(slug);
  if (!d) notFound();
  const { category, products, guides } = d;
  return (
    <>
      <TrackView event="category_view" entityType="category" entityId={category.id} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Categories", url: absoluteUrl("/categories") },
          { name: category.name, url: absoluteUrl(`/categories/${category.slug}`) },
        ])}
      />
      <header className="container-page pb-10 pt-6 md:pb-14 md:pt-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories", href: "/categories" }, { label: category.name }]} />
        <p className="eyebrow mt-10">Category</p>
        <h1 className="mt-4 text-[3rem] font-semibold uppercase leading-none tracking-[0.06em] text-ink md:text-[4.5rem]">{category.name}</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{category.description}</p>
      </header>
      <section className="container-page border-t border-line pt-10">
        <p className="mb-8 text-[13px] text-muted">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        {products.length ? <ProductGrid products={products} priorityCount={4} /> : <EmptyState title="No products here yet." description="We're researching this category now." />}
      </section>
      {guides.length ? (
        <section className="container-page mt-20 border-t border-line pt-12">
          <h2 className="display text-[2rem] text-ink md:text-[2.5rem]">Guides in {category.name}</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
