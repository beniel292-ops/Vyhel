import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideDetailView } from "@/components/site/GuideDetailView";
import { JsonLd, breadcrumbLd } from "@/lib/jsonld";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { getGuideDetail } from "@/server/queries/public";
import { notFoundInReviewMode } from "@/lib/review-mode";

export const revalidate = 300;

/** Render on first request, then cache (ISR). Admin edits revalidate immediately. */
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getGuideDetail(slug);
  if (!detail) return { title: "Guide not found", robots: { index: false } };
  const g = detail.guide;
  const title = g.seoTitle || g.title;
  const description = g.seoDescription || g.excerpt;
  return {
    title,
    description,
    alternates: { canonical: g.canonicalUrl || `/guides/${g.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/guides/${g.slug}`,
      publishedTime: g.publishedAt?.toISOString(),
      modifiedTime: g.updatedAt.toISOString(),
      authors: [g.author],
      ...(g.heroImage ? { images: [g.heroImage] } : {}),
    },
    robots: g.isDemo ? { index: false, follow: true } : undefined,
  };
}

export default async function GuidePage({ params }: Props) {
  await notFoundInReviewMode(); // Razorpay review mode — docs/razorpay-review-mode.md
  const { slug } = await params;
  const [detail, settings] = await Promise.all([getGuideDetail(slug), getSettings()]);
  if (!detail) notFound();
  const g = detail.guide;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", url: absoluteUrl("/") },
            { name: "Guides", url: absoluteUrl("/guides") },
            { name: g.title, url: absoluteUrl(`/guides/${g.slug}`) },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.excerpt,
            datePublished: g.publishedAt?.toISOString(),
            dateModified: g.updatedAt.toISOString(),
            author: { "@type": "Organization", name: g.author },
            publisher: { "@type": "Organization", name: settings.siteName },
            mainEntityOfPage: absoluteUrl(`/guides/${g.slug}`),
            ...(g.heroImage ? { image: g.heroImage } : {}),
          },
        ]}
      />
      <GuideDetailView detail={detail} settings={settings} />
    </>
  );
}
