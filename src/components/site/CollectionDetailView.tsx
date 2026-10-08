import Link from "next/link";
import type { SiteSettings } from "@/lib/settings-shape";
import type { getCollectionDetail } from "@/server/queries/public";
import { EmptyState } from "@/components/ui/EmptyState";
import { AffiliateCTA } from "./AffiliateCTA";
import { TrackView } from "./Analytics";
import { ArticleBody } from "./ArticleBody";
import { GuideCard } from "./Cards";
import { EditorialImage } from "./Media";
import { BADGE_LABELS, Badge, Breadcrumbs, DemoTag, Disclosure, ScoreBadge } from "./bits";

type Detail = NonNullable<Awaited<ReturnType<typeof getCollectionDetail>>>;

export function CollectionDetailView({ detail, settings, preview = false }: { detail: Detail; settings: SiteSettings; preview?: boolean }) {
  const { collection, products, guides } = detail;
  const [featured, ...others] = products;
  return (
    <article>
      {!preview ? <TrackView event="collection_view" entityType="collection" entityId={collection.id} /> : null}
      <header className="border-b border-line bg-sunken/60">
        <div className="container-page grid gap-10 py-10 md:py-16 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: collection.name }]} />
            <p className="eyebrow mt-10">Collection {collection.isDemo ? <DemoTag className="ml-2 align-middle" /> : null}</p>
            <h1 className="mt-4 text-[2.75rem] font-semibold uppercase leading-[0.95] tracking-[0.04em] text-ink md:text-[4.25rem]">
              {collection.name}
            </h1>
            {collection.tagline ? <p className="display mt-5 max-w-lg text-[1.625rem] leading-snug text-ink-soft">&ldquo;{collection.tagline}&rdquo;</p> : null}
            <p className="mt-4 text-sm text-muted">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>
          {collection.heroImage ? (
            <EditorialImage src={collection.heroImage} alt={collection.heroImageAlt} name={collection.name} priority className="aspect-[4/3] w-full" />
          ) : null}
        </div>
      </header>

      <div className="container-page">
        {featured ? (
          <section aria-labelledby="featured-h" className="grid gap-8 border-b border-line py-12 md:grid-cols-[1.1fr_1fr] md:gap-14 md:py-16">
            <Link href={`/products/${featured.slug}`} className="group">
              <EditorialImage src={featured.imageUrl} alt={featured.imageAlt} name={featured.name} tone={featured.categorySlug} className="aspect-[4/3] w-full" priority />
            </Link>
            <div className="flex flex-col justify-center">
              <p className="eyebrow">Featured in this collection</p>
              <h2 id="featured-h" className="display mt-3 text-[2.25rem] text-ink md:text-[2.75rem]">
                <Link href={`/products/${featured.slug}`} className="hover:underline hover:decoration-1 hover:underline-offset-4">
                  {featured.name}
                </Link>
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <ScoreBadge score={featured.vyhelScore} />
                {featured.badge ? <Badge tone="accent">{BADGE_LABELS[featured.badge]}</Badge> : null}
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{featured.note || featured.shortDescription}</p>
              <div className="mt-6 flex flex-wrap items-start gap-4">
                <AffiliateCTA href={featured.link?.specialLink} productId={featured.id} linkId={featured.link?.id} placement="collection_featured" pageType="collection" pageId={collection.id} label={settings.defaultCtaText} merchant={featured.link?.merchant} merchantLabel={featured.link?.label} />
                <Link href={`/products/${featured.slug}`} className="inline-flex h-12 items-center text-sm font-medium text-ink underline-offset-4 hover:underline">
                  Read the full take
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {collection.intro ? (
          <section className="grid gap-6 border-b border-line py-12 md:grid-cols-[16rem_1fr] md:py-16">
            <h2 className="eyebrow pt-2">Why this collection exists</h2>
            <ArticleBody markdown={collection.intro} className="max-w-2xl !text-lg" />
          </section>
        ) : null}

        {products.length === 1 ? (
          <Disclosure className="py-8" text={settings.affiliateDisclosure} />
        ) : (
        <section aria-labelledby="recommended-h" className="py-12 md:py-16">
          <h2 id="recommended-h" className="display text-[2rem] text-ink md:text-[2.5rem]">
            {others.length ? "More in this collection" : "Recommended products"}
          </h2>
          {products.length === 0 ? (
            <EmptyState className="mt-8" title="No products here yet." />
          ) : (
            <ol className="mt-8 divide-y divide-line border-y border-line">
              {others.map((p, i) => (
                <li key={p.id} className="grid gap-5 py-6 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-8">
                  <Link href={`/products/${p.slug}`} className="group hidden sm:block">
                    <EditorialImage src={p.imageUrl} alt={p.imageAlt} name={p.name} tone={p.categorySlug} className="aspect-square w-full" sizes="112px" />
                  </Link>
                  <div className="min-w-0">
                    <p className="eyebrow">
                      {String(i + 2).padStart(2, "0")} · {p.categoryName}
                    </p>
                    <h3 className="mt-1 text-lg font-medium text-ink">
                      <Link href={`/products/${p.slug}`} className="hover:underline hover:underline-offset-4">
                        {p.name}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.note || p.shortDescription}</p>
                    <div className="mt-2">
                      <ScoreBadge score={p.vyhelScore} />
                    </div>
                  </div>
                  <AffiliateCTA href={p.link?.specialLink} productId={p.id} linkId={p.link?.id} placement="collection_list" pageType="collection" pageId={collection.id} label={settings.defaultCtaText} merchant={p.link?.merchant} merchantLabel={p.link?.label} size="md" variant="secondary" />
                </li>
              ))}
            </ol>
          )}
          <Disclosure className="mt-6" text={settings.affiliateDisclosure} />
        </section>
        )}

        {guides.length ? (
          <section className="border-t border-line pt-12">
            <h2 className="display text-[2rem] text-ink">Related guides</h2>
            <div className="mt-8 grid gap-10 md:grid-cols-3">
              {guides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
