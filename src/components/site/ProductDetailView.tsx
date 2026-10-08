import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon, MinusIcon } from "@/components/ui/icons";
import type { SiteSettings } from "@/lib/settings-shape";
import { formatScore } from "@/lib/utils";
import type { ProductDetail } from "@/server/queries/public";
import { merchantDisplayName } from "@/lib/merchant-name";
import { AffiliateCTA } from "./AffiliateCTA";
import { TrackView } from "./Analytics";
import { GuideCard, ProductCard } from "./Cards";
import { EditorialImage } from "./Media";
import { MobileCtaBar } from "./MobileCtaBar";
import { BADGE_LABELS, Badge, Breadcrumbs, DemoTag, ScoreBadge } from "./bits";

function Section({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="border-t border-line py-10 md:py-12">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h2 id={`${id}-h`} className="display text-[1.875rem] text-ink md:text-[2.25rem]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const SCORE_ROWS = [
  ["Usefulness", "usefulnessScore"],
  ["Ease of use", "easeScore"],
  ["Versatility", "versatilityScore"],
  ["Value", "valueScore"],
  ["Design", "designScore"],
] as const;

export function ScoreBreakdown({ product }: { product: ProductDetail["product"] }) {
  const rows = SCORE_ROWS.filter(([, key]) => product[key] !== null);
  if (!rows.length) return null;
  return (
    <dl className="space-y-3">
      {rows.map(([label, key]) => {
        const v = Number(product[key]);
        return (
          <div key={key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <dt className="text-muted">{label}</dt>
            <dd className="h-1 overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
              <div className="h-full rounded-full bg-ink" style={{ width: `${v * 10}%` }} />
            </dd>
            <dd className="text-right tabular-nums text-ink">
              {formatScore(v)}
              <span className="sr-only"> out of 10</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function ProductDetailView({
  detail,
  settings,
  preview = false,
}: {
  detail: ProductDetail;
  settings: SiteSettings;
  preview?: boolean;
}) {
  const { product, category, primaryLink, alternatives, guides } = detail;
  const href = primaryLink?.specialLink ?? null;
  const cta = settings.defaultCtaText || "Buy on Amazon";
  const ctaProps = {
    href,
    productId: product.id,
    linkId: primaryLink?.id,
    pageType: "product" as const,
    pageId: product.id,
    merchant: primaryLink?.merchant,
    merchantLabel: primaryLink?.label,
  };
  const merchant = merchantDisplayName(primaryLink?.merchant, primaryLink?.label, href);

  const toc = [
    ["quick-take", "The quick take"],
    product.whyPicked && ["why", "Why we picked it"],
    product.bestFor.length && ["best-for", "Best for"],
    product.thingsToKnow && ["things-to-know", "Things to know"],
    (product.pros.length || product.cons.length) && ["pros-cons", "Pros & cons"],
    product.vyhelScore !== null && ["score", "Vyhel score"],
    (product.whoShouldBuy || product.whoShouldSkip) && ["who", "Who it's for"],
    product.faq.length && ["faq", "FAQ"],
  ].filter(Boolean) as [string, string][];

  return (
    <article>
      {!preview ? <TrackView event="product_view" entityType="product" entityId={product.id} /> : null}

      {/* ---------------------------------------------------------- header */}
      <div className="container-page pt-6 md:pt-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            ...(category ? [{ label: category.name, href: `/categories/${category.slug}` }] : [{ label: "Products", href: "/products" }]),
            { label: product.name },
          ]}
        />
      </div>

      <header className="container-page grid gap-8 pb-12 pt-6 md:pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-16">
        <div className="relative">
          <EditorialImage
            src={product.imageUrl}
            alt={product.imageAlt}
            name={product.name}
            tone={category?.slug}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3] w-full border border-line-soft lg:aspect-[5/4]"
          />
          {product.imageUrl && product.imageSource ? (
            <p className="mt-2 text-[11px] text-faint">Image: {product.imageSource}</p>
          ) : null}
        </div>

        <div className="flex flex-col lg:pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {category ? (
              <Link href={`/categories/${category.slug}`} className="eyebrow hover:text-ink">
                {category.name}
                {product.subcategory ? ` · ${product.subcategory}` : ""}
              </Link>
            ) : null}
            {product.badge ? <Badge tone={product.badge === "editors_pick" ? "accent" : "neutral"}>{BADGE_LABELS[product.badge]}</Badge> : null}
            {product.isDemo ? <DemoTag /> : null}
          </div>
          <h1 className="display mt-4 text-[2.5rem] text-ink md:text-[3.25rem]">{product.name}</h1>
          {product.brand ? <p className="mt-2 text-sm text-muted">by {product.brand}</p> : null}
          {product.editorialStatement ? (
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">{product.editorialStatement}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-6 border-y border-line py-6">
            {product.vyhelScore !== null ? (
              <div>
                <p className="eyebrow mb-2">Vyhel score</p>
                <ScoreBadge score={product.vyhelScore} size="lg" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm text-muted">Sold by {merchant}, not Vyhel · check the current price there</p>
              <div id="primary-cta">
                <AffiliateCTA {...ctaProps} placement="product_hero" label={cta} fullWidth />
              </div>
            </div>
          </div>
          {product.isDemo ? (
            <p className="mt-4 rounded-md bg-warn-soft px-3 py-2.5 text-[13px] leading-relaxed text-warn">
              This is development example content used to demonstrate Vyhel&rsquo;s layout. It is not a verified
              recommendation.
            </p>
          ) : null}
        </div>
      </header>

      {/* ------------------------------------------------------------ body */}
      <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="min-w-0 max-w-3xl">
          <Section id="quick-take" eyebrow="The quick take" title="In short">
            <p className="text-[17px] leading-[1.75] text-ink-soft">{product.description || product.shortDescription}</p>
          </Section>

          {product.whyPicked ? (
            <Section id="why" title="Why we picked it">
              <p className="text-[17px] leading-[1.75] text-ink-soft">{product.whyPicked}</p>
            </Section>
          ) : null}

          {product.bestFor.length ? (
            <Section id="best-for" title="Best for">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {product.bestFor.map((b) => (
                  <li key={b} className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-4">
                    <CheckIcon size={16} className="text-accent" />
                    <p className="mt-2 text-[15px] font-medium text-ink">{b}</p>
                  </li>
                ))}
              </ul>
              {product.notFor.length ? (
                <p className="mt-4 text-sm text-muted">
                  <span className="font-medium text-ink-soft">Less suited to:</span> {product.notFor.join(" · ")}
                </p>
              ) : null}
            </Section>
          ) : null}

          {product.thingsToKnow ? (
            <Section id="things-to-know" title="Things to know">
              <div className="rounded-[var(--radius-card)] border-l-2 border-accent bg-surface px-5 py-5 md:px-6">
                <p className="text-[16px] leading-[1.75] text-ink-soft">{product.thingsToKnow}</p>
              </div>
            </Section>
          ) : null}

          {product.pros.length || product.cons.length ? (
            <Section id="pros-cons" title="Pros & cons">
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-4">Pros</p>
                  <ul className="space-y-3">
                    {product.pros.map((p) => (
                      <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                        <CheckIcon size={18} className="mt-0.5 shrink-0 text-accent" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow mb-4">Cons</p>
                  <ul className="space-y-3">
                    {product.cons.map((c) => (
                      <li key={c} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                        <MinusIcon size={18} className="mt-0.5 shrink-0 text-danger" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>
          ) : null}

          {product.vyhelScore !== null ? (
            <Section id="score" title="Vyhel score">
              <div className="grid gap-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 md:grid-cols-[auto_1fr] md:gap-12 md:p-8">
                <ScoreBadge score={product.vyhelScore} size="lg" />
                <ScoreBreakdown product={product} />
              </div>
              <p className="mt-3 text-xs text-muted">
                Vyhel scores are our own editorial assessments of usefulness, ease of use, versatility, value and
                design. They are not Amazon ratings and are not based on customer reviews.
              </p>
            </Section>
          ) : null}

          {product.whoShouldBuy || product.whoShouldSkip ? (
            <Section id="who" title="Who should buy it — and who should skip it">
              <div className="grid gap-4 sm:grid-cols-2">
                {product.whoShouldBuy ? (
                  <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                    <p className="eyebrow !text-accent">Consider it if</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{product.whoShouldBuy}</p>
                  </div>
                ) : null}
                {product.whoShouldSkip ? (
                  <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                    <p className="eyebrow">Skip it if</p>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{product.whoShouldSkip}</p>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {product.faq.length ? (
            <Section id="faq" title="Questions">
              <div className="divide-y divide-line border-y border-line">
                {product.faq.map((f) => (
                  <details key={f.question} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[16px] font-medium text-ink">
                      {f.question}
                      <span className="mt-0.5 text-muted transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{f.answer}</p>
                  </details>
                ))}
              </div>
            </Section>
          ) : null}

          {/* final CTA */}
          <section className="mt-2 rounded-[var(--radius-card)] bg-ink px-6 py-10 text-white md:px-10">
            <p className="display text-[2.25rem]">Interested?</p>
            <p className="mt-2 max-w-md text-[15px] text-white/70">
              Prices and availability change often, so we don&rsquo;t show them here. Check the current listing on
              Amazon.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <AffiliateCTA
                {...ctaProps}
                placement="product_footer"
                label={`Check the current ${merchant} listing`}
                variant="secondary"
                showDisclosure={false}
                className="[&_a]:h-auto [&_a]:min-h-12 [&_a]:whitespace-normal [&_a]:py-3 [&_a]:text-center [&_a]:border-white/30 [&_a]:bg-white [&_a]:text-ink [&_a:hover]:bg-white/90"
              />
            </div>
            <p className="mt-4 text-xs text-white/60">Paid link · {settings.affiliateDisclosure}</p>
          </section>
        </div>

        {/* sticky summary */}
        <aside className="hidden lg:block" aria-label="Summary">
          <div className="sticky top-24 space-y-6 pt-10">
            {toc.length > 2 ? (
              <nav aria-label="On this page" className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <p className="eyebrow mb-3">On this page</p>
                <ul className="space-y-2 text-sm">
                  {toc.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`} className="text-muted hover:text-ink">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <p className="text-sm font-medium text-ink">{product.name}</p>
              <p className="mt-1 text-xs text-muted">Sold by {merchant} · check the current price there</p>
              <div className="mt-4">
                <AffiliateCTA {...ctaProps} placement="product_sidebar" label={cta} size="md" fullWidth />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ---------------------------------------------------- related */}
      {alternatives.length ? (
        <section className="container-page mt-20 border-t border-line pt-12">
          <h2 className="display text-[2rem] text-ink md:text-[2.5rem]">Alternatives worth comparing</h2>
          <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-10 min-[400px]:grid-cols-2 md:grid-cols-4 md:gap-x-6">
            {alternatives.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      {guides.length ? (
        <section className="container-page mt-20 border-t border-line pt-12">
          <h2 className="display text-[2rem] text-ink md:text-[2.5rem]">Related guides</h2>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      ) : null}

      <MobileCtaBar targetId="primary-cta">
        <AffiliateCTA {...ctaProps} placement="product_mobile_bar" label={cta} size="md" showDisclosure={false} fullWidth className="flex-1" />
        <span className="shrink-0 text-[11px] text-muted">Paid link</span>
      </MobileCtaBar>
    </article>
  );
}
