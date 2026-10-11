import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/site/ArticleBody";
import { Breadcrumbs } from "@/components/site/bits";
import { BuyBox } from "@/components/site/BuyBox";
import { EditorialImage } from "@/components/site/Media";
import { CheckIcon } from "@/components/ui/icons";
import { JsonLd } from "@/lib/jsonld";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { getPublicDigitalProduct } from "@/server/services/digital-products";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicDigitalProduct(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  return {
    title: p.name,
    description: p.shortDescription,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: p.name, description: p.shortDescription, url: `/shop/${p.slug}`, ...(p.imageUrl ? { images: [p.imageUrl] } : {}) },
  };
}

export default async function DigitalProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, settings] = await Promise.all([getPublicDigitalProduct(slug), getSettings()]);
  if (!p) notFound();
  const price = formatMoney(p.priceMinor, p.currency);
  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.shortDescription,
          ...(p.imageUrl ? { image: p.imageUrl } : {}),
          brand: { "@type": "Brand", name: settings.siteName },
          offers: { "@type": "Offer", price: (p.priceMinor / 100).toFixed(2), priceCurrency: p.currency, availability: "https://schema.org/InStock", url: absoluteUrl(`/shop/${p.slug}`) },
        }}
      />
      <div className="container-page pt-6 md:pt-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: p.name }]} />
      </div>
      <div className="container-page grid gap-10 pb-16 pt-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <EditorialImage src={p.imageUrl} alt={p.imageAlt} name={p.name} priority className="aspect-square w-full border border-line-soft lg:aspect-[5/4]" sizes="(min-width:1024px) 50vw, 100vw" label="Digital download" fit="contain" />
        <div className="lg:pt-4">
          <p className="eyebrow !text-accent">Sold by Vyhel · Digital download</p>
          <h1 className="display mt-4 text-[2.5rem] text-ink md:text-[3.25rem]">{p.name}</h1>
          {p.shortDescription ? <p className="mt-4 text-lg leading-relaxed text-ink-soft">{p.shortDescription}</p> : null}
          <p className="mt-6 text-3xl font-semibold tabular-nums text-ink">{price}</p>
          <p className="mt-1 text-xs text-muted">Inclusive of applicable taxes · One-time payment</p>
          <div className="mt-6">
            <BuyBox slug={p.slug} priceLabel={price} productName={p.name} />
          </div>
          {p.whatsIncluded.length ? (
            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow mb-3">What&rsquo;s included</p>
              <ul className="space-y-2">
                {p.whatsIncluded.map((w) => (
                  <li key={w} className="flex gap-2.5 text-[15px] text-ink-soft">
                    <CheckIcon size={18} className="mt-0.5 shrink-0 text-accent" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul className="mt-8 grid gap-2 border-t border-line pt-6 text-[13px] text-muted">
            <li>✓ Delivered instantly by email after payment</li>
            <li>✓ Private download link (no account needed)</li>
            <li>
              ✓ Questions? See our <Link href="/delivery-policy" className="underline underline-offset-2">delivery</Link> and{" "}
              <Link href="/refund-policy" className="underline underline-offset-2">refund</Link> policies
            </li>
            {settings.contactEmail ? (
              <li>
                ✓ Support:{" "}
                <a href={`mailto:${settings.contactEmail}`} className="underline underline-offset-2">
                  {settings.contactEmail}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      {p.description ? (
        <section className="container-page max-w-3xl border-t border-line pt-12">
          <h2 className="display text-[2rem] text-ink">About this product</h2>
          <ArticleBody markdown={p.description} className="mt-6" />
        </section>
      ) : null}
    </article>
  );
}
