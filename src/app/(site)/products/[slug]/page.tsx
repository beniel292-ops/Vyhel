import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/site/ProductDetailView";
import { JsonLd, breadcrumbLd } from "@/lib/jsonld";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { getProductDetail } from "@/server/queries/public";
import { notFoundInReviewMode } from "@/lib/review-mode";

export const revalidate = 300;

/** Render on first request, then cache (ISR). Admin edits revalidate immediately. */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProductDetail(slug);
  if (!detail) return { title: "Product not found", robots: { index: false } };
  const p = detail.product;
  const title = p.seoTitle || `${p.name}: who it's for, pros & cons`;
  const description = p.seoDescription || p.editorialStatement || p.shortDescription;
  const image = p.ogImage || p.imageUrl;
  return {
    title,
    description,
    alternates: { canonical: p.canonicalUrl || `/products/${p.slug}` },
    openGraph: {
      type: "article",
      title: p.ogTitle || title,
      description: p.ogDescription || description,
      url: `/products/${p.slug}`,
      ...(image ? { images: [image] } : {}),
    },
    robots: p.isDemo ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  await notFoundInReviewMode(); // Razorpay review mode — docs/razorpay-review-mode.md
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getProductDetail(slug), getSettings()]);
  if (!detail) notFound();
  const { product, category } = detail;

  const ld: Record<string, unknown>[] = [
    breadcrumbLd([
      { name: "Home", url: absoluteUrl("/") },
      ...(category ? [{ name: category.name, url: absoluteUrl(`/categories/${category.slug}`) }] : []),
      { name: product.name, url: absoluteUrl(`/products/${product.slug}`) },
    ]),
  ];
  // Only describe what is true: an editorial review by Vyhel. No prices, offers or aggregate ratings.
  if (!product.isDemo && product.vyhelScore !== null) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.shortDescription,
      ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
      ...(product.imageUrl ? { image: product.imageUrl } : {}),
      review: {
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: product.vyhelScore, bestRating: 10, worstRating: 0 },
        author: { "@type": "Organization", name: settings.siteName },
        reviewBody: product.description,
        positiveNotes: product.pros.length
          ? { "@type": "ItemList", itemListElement: product.pros.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p })) }
          : undefined,
        negativeNotes: product.cons.length
          ? { "@type": "ItemList", itemListElement: product.cons.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p })) }
          : undefined,
      },
    });
  }
  if (product.faq.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: product.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return (
    <>
      <JsonLd data={ld} />
      <ProductDetailView detail={detail} settings={settings} />
    </>
  );
}
