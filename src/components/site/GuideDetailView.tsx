import Link from "next/link";
import type { SiteSettings } from "@/lib/settings-shape";
import { formatDate, formatScore } from "@/lib/utils";
import type { GuideDetail } from "@/server/queries/public";
import { AffiliateCTA } from "./AffiliateCTA";
import { TrackView } from "./Analytics";
import { ArticleBody, extractHeadings } from "./ArticleBody";
import { GuideCard } from "./Cards";
import { EditorialImage } from "./Media";
import { Breadcrumbs, DemoTag, Disclosure, GUIDE_TYPE_LABELS, ScoreBadge } from "./bits";

export function GuideDetailView({ detail, settings, preview = false }: { detail: GuideDetail; settings: SiteSettings; preview?: boolean }) {
  const { guide, category, products, related } = detail;
  const headings = extractHeadings(guide.content);
  if (products.length) headings.push({ id: "recommendations", label: "Our recommendations" });
  if (products.length > 1) headings.push({ id: "compare", label: "Side by side" });
  if (guide.conclusion) headings.push({ id: "conclusion", label: "The bottom line" });

  return (
    <article>
      {!preview ? <TrackView event="guide_view" entityType="guide" entityId={guide.id} /> : null}
      <header className="container-page max-w-4xl pt-6 text-center md:pt-10">
        <div className="flex justify-center">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: guide.title }]} />
        </div>
        <p className="eyebrow mt-10 flex flex-wrap items-center justify-center gap-x-2">
          {category ? (
            <Link href={`/guides?category=${category.slug}`} className="hover:text-ink">
              {category.name}
            </Link>
          ) : null}
          {category ? <span className="text-faint">·</span> : null}
          <Link href={`/guides?type=${guide.guideType}`} className="hover:text-ink">
            {GUIDE_TYPE_LABELS[guide.guideType]}
          </Link>
        </p>
        <h1 className="display mx-auto mt-5 max-w-3xl text-[2.625rem] text-ink md:text-[4rem]">{guide.title}</h1>
        {guide.subtitle ? <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">{guide.subtitle}</p> : null}
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span>By {guide.author}</span>
          {guide.publishedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={new Date(guide.publishedAt).toISOString()}>{formatDate(guide.publishedAt, { month: "long" })}</time>
            </>
          ) : null}
          {guide.readingTime ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{guide.readingTime} min read</span>
            </>
          ) : null}
          {guide.updatedAt && guide.publishedAt && guide.updatedAt.getTime() - guide.publishedAt.getTime() > 86_400_000 ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Updated {formatDate(guide.updatedAt)}</span>
            </>
          ) : null}
          {guide.isDemo ? <DemoTag /> : null}
        </p>
      </header>

      <div className="container-page mt-10 max-w-6xl md:mt-14">
        <EditorialImage
          src={guide.heroImage}
          alt={guide.heroImageAlt}
          name={guide.title}
          tone={category?.slug}
          priority
          sizes="(min-width: 1280px) 1152px, 100vw"
          className="aspect-[16/9] w-full md:aspect-[21/9]"
        />
      </div>

      <div className="container-page mt-12 grid max-w-6xl gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <aside className="lg:order-none">
          {headings.length > 1 ? (
            <nav aria-label="Table of contents" className="lg:sticky lg:top-24">
              <details className="group rounded-[var(--radius-card)] border border-line bg-surface p-4 lg:border-0 lg:bg-transparent lg:p-0" open>
                <summary className="eyebrow cursor-pointer list-none lg:pointer-events-none">Contents</summary>
                <ol className="mt-3 space-y-2 border-l border-line text-[13.5px]">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-ink hover:text-ink">
                        {h.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            </nav>
          ) : null}
        </aside>

        <div className="min-w-0 max-w-[42rem]">
          <p className="display text-[1.5rem] leading-snug text-ink md:text-[1.75rem]">{guide.excerpt}</p>
          {products.length ? (
            <Disclosure
              className="mt-6 border-y border-line py-3"
              text={`This guide contains paid links. ${settings.affiliateDisclosure}`}
            />
          ) : null}
          <ArticleBody markdown={guide.content} className="mt-8" />

          {products.length ? (
            <section id="recommendations" className="mt-16 scroll-mt-24">
              <h2 className="display text-[2rem] text-ink">Our recommendations</h2>
              <div className="mt-6 space-y-4">
                {products.map((p, i) => (
                  <div key={p.id} className="grid gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-[9rem_1fr] sm:p-5">
                    <Link href={`/products/${p.slug}`} className="group">
                      <EditorialImage src={p.imageUrl} alt={p.imageAlt} name={p.name} tone={p.categorySlug} className="aspect-square w-full" sizes="144px" />
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="eyebrow">
                            {String(i + 1).padStart(2, "0")} · {p.categoryName}
                          </p>
                          <h3 className="mt-1 text-lg font-medium text-ink">
                            <Link href={`/products/${p.slug}`} className="hover:underline hover:underline-offset-4">
                              {p.name}
                            </Link>
                          </h3>
                        </div>
                        <ScoreBadge score={p.vyhelScore} />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{p.note || p.shortDescription}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <AffiliateCTA
                          href={p.link?.specialLink}
                          productId={p.id}
                          linkId={p.link?.id}
                          placement="guide_recommendation"
                          pageType="guide"
                          pageId={guide.id}
                          label={settings.defaultCtaText}
                          merchant={p.link?.merchant}
                          merchantLabel={p.link?.label}
                          size="sm"
                          className="!flex-row !items-center gap-3"
                        />
                        <Link href={`/products/${p.slug}`} className="text-[13px] font-medium text-ink underline-offset-4 hover:underline">
                          Read the full take
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {products.length > 1 ? (
            <section id="compare" className="mt-16 scroll-mt-24">
              <h2 className="display text-[2rem] text-ink">Side by side</h2>
              <div className="relative mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Product</th>
                      <th scope="col" className="px-4 py-3 font-semibold">In short</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Vyhel score</th>
                      <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Link</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <th scope="row" className="px-4 py-3.5 font-medium text-ink">{p.name}</th>
                        <td className="px-4 py-3.5 text-muted">{p.shortDescription}</td>
                        <td className="px-4 py-3.5 tabular-nums text-ink">{formatScore(p.vyhelScore) ?? "—"}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/products/${p.slug}`} className="whitespace-nowrap text-[13px] font-medium text-ink underline underline-offset-4">
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {guide.conclusion ? (
            <section id="conclusion" className="mt-16 scroll-mt-24 rounded-[var(--radius-card)] bg-ink px-6 py-8 text-white md:px-8">
              <h2 className="eyebrow !text-white/60">The bottom line</h2>
              <p className="display mt-3 text-[1.625rem] leading-snug">{guide.conclusion}</p>
            </section>
          ) : null}

          <div className="mt-10 border-t border-line pt-6">
            <Disclosure text={`${settings.affiliateDisclosure} Products in this guide are sold by the retailer, not by Vyhel. Prices and availability are shown on the retailer's site.`} />
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="container-page mt-20 border-t border-line pt-12">
          <h2 className="display text-[2rem] text-ink md:text-[2.5rem]">Keep reading</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {related.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
