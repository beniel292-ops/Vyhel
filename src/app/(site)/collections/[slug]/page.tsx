import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionDetailView } from "@/components/site/CollectionDetailView";
import { JsonLd } from "@/lib/jsonld";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { getCollectionDetail } from "@/server/queries/public";
import { notFoundInReviewMode } from "@/lib/review-mode";

export const revalidate = 300;

/** Render on first request, then cache (ISR). Admin edits revalidate immediately. */
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getCollectionDetail(slug);
  if (!d) return { title: "Collection not found", robots: { index: false } };
  const c = d.collection;
  return {
    title: c.seoTitle || c.name,
    description: c.seoDescription || c.tagline || c.description,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: c.seoTitle || c.name, description: c.tagline || c.description, url: `/collections/${c.slug}`, ...(c.heroImage ? { images: [c.heroImage] } : {}) },
    robots: c.isDemo ? { index: false, follow: true } : undefined,
  };
}

export default async function CollectionPage({ params }: Props) {
  await notFoundInReviewMode(); // Razorpay review mode — docs/razorpay-review-mode.md
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getCollectionDetail(slug), getSettings()]);
  if (!detail) notFound();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: detail.collection.name,
          itemListElement: detail.products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/products/${p.slug}`), name: p.name })),
        }}
      />
      <CollectionDetailView detail={detail} settings={settings} />
    </>
  );
}
