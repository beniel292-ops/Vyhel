import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowRight } from "@/components/ui/icons";
import { CategoryCard, CollectionCard, FeatureCollection, GuideCard, ProductGrid } from "@/components/site/Cards";
import { EditorialImage } from "@/components/site/Media";
import { ScoreBadge, SectionHeader } from "@/components/site/bits";
import { DigitalProductCard } from "@/components/site/DigitalCards";
import { getSettings } from "@/lib/settings";
import { listPublicDigitalProducts } from "@/server/services/digital-products";
import {
  getCategoriesWithCounts,
  getHeroProducts,
  getTrendingProducts,
  listCollections,
  listGuides,
} from "@/server/queries/public";

export const revalidate = 300;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [settings, hero, trending, categories, collections, guides, shop] = await Promise.all([
    getSettings(),
    getHeroProducts(),
    getTrendingProducts(8),
    getCategoriesWithCounts(),
    listCollections({ featuredOnly: true, limit: 5 }),
    listGuides({ limit: 6 }),
    listPublicDigitalProducts(3),
  ]);

  const [featureGuide, ...otherGuides] = guides;
  const [leadCollection, ...otherCollections] = collections;

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="container-page grid items-center gap-12 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
        <div className="animate-fade-up">
          <p className="eyebrow mb-6">Product discovery, done better</p>
          <h1 className="text-ink">
            <span className="display block text-[3.5rem] sm:text-[4.5rem] lg:text-[5.75rem]">Smart finds.</span>
            <span className="mt-2 block text-[1.75rem] font-medium leading-tight tracking-[-0.02em] sm:text-[2.25rem] lg:text-[2.75rem]">
              Better buying decisions.
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted md:text-[17px]">{settings.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/products" size="lg">
              Explore products
            </ButtonLink>
            <ButtonLink href="/guides" variant="secondary" size="lg">
              Read our guides
            </ButtonLink>
          </div>
        </div>

        {hero.length > 0 ? (
          <div className="relative grid grid-cols-6 grid-rows-[auto_auto] gap-3 sm:gap-4" aria-label="Featured products">
            {hero.map((p, i) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className={
                  i === 0
                    ? "group col-span-4 row-span-2"
                    : i === 1
                      ? "group col-span-2 self-end"
                      : "group col-span-2 self-start"
                }
              >
                <EditorialImage
                  src={p.imageUrl}
                  alt={p.imageAlt}
                  name={p.name}
                  tone={p.categorySlug}
                  priority
                  sizes={i === 0 ? "(min-width: 1024px) 30vw, 66vw" : "(min-width: 1024px) 15vw, 33vw"}
                  className={i === 0 ? "aspect-[4/5] w-full" : "aspect-[3/4] w-full"}
                />
                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="eyebrow truncate !text-[10px]">{p.categoryName}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink group-hover:underline group-hover:underline-offset-4">
                      {p.name}
                    </p>
                  </div>
                  {i === 0 ? <ScoreBadge score={p.vyhelScore} /> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="hidden aspect-[5/4] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line lg:flex">
            <p className="display text-2xl text-faint">First picks arriving soon.</p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- TRENDING */}
      <section className="container-page py-14 md:py-20">
        <SectionHeader
          title="Worth a look"
          description="A rotating selection of products currently getting attention."
          href="/products"
          hrefLabel="All products"
        />
        {trending.length ? (
          <ProductGrid products={trending.length > 4 ? trending.slice(0, Math.floor(trending.length / 4) * 4) : trending} />
        ) : (
          <EmptyState title="No products here yet." description="New finds are being researched. Check back soon." />
        )}
      </section>

      {/* ------------------------------------------------------- CATEGORIES */}
      <section className="border-y border-line bg-sunken/60 py-14 md:py-20">
        <div className="container-page">
          <SectionHeader eyebrow="Shop by category" title="Start with what you need" href="/categories" hrefLabel="All categories" />
          {categories.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
              {categories.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </div>
          ) : (
            <EmptyState title="Categories are on the way." />
          )}
        </div>
      </section>

      {/* ------------------------------------------------ PROBLEM → SOLUTION */}
      {settings.problems.length ? (
        <section className="container-page py-14 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <div>
              <p className="eyebrow mb-4">How Vyhel works</p>
              <h2 className="display text-[2.75rem] text-ink md:text-[3.5rem]">Start with the problem.</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
                Most good purchases begin with an annoyance, not a product. Tell us what&rsquo;s bothering you and
                we&rsquo;ll point you to what&rsquo;s worth considering.
              </p>
            </div>
            <ul className="border-t border-line">
              {settings.problems.map((p) => (
                <li key={p.title} className="border-b border-line">
                  <Link href={p.href} className="group flex items-center gap-6 py-6 md:py-7">
                    <span className="min-w-0 flex-1">
                      <span className="display block text-[1.75rem] text-ink md:text-[2.125rem]">{p.title}</span>
                      <span className="mt-1 block text-sm text-muted">
                        <span aria-hidden="true" className="mr-1.5 text-accent">
                          →
                        </span>
                        {p.description}
                      </span>
                    </span>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-white">
                      <ArrowRight size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ COLLECTIONS */}
      <section className="container-page py-14 md:py-20">
        <SectionHeader
          eyebrow="Collections"
          title="Curated around how you live"
          description="Small, considered sets of products built around a situation, not a sale."
          href="/collections"
          hrefLabel="All collections"
        />
        {leadCollection ? (
          <div className="space-y-4 md:space-y-6">
            <FeatureCollection collection={leadCollection} />
            {otherCollections.length ? (
              <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {otherCollections.slice(0, 3).map((c) => (
                  <CollectionCard key={c.id} collection={c} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="Collections are being curated." />
        )}
      </section>

      {/* ------------------------------------------------------- VYHEL SHOP */}
      {shop.length ? (
        <section className="border-y border-line bg-sunken/60 py-14 md:py-20">
          <div className="container-page">
            <SectionHeader
              eyebrow="Sold by Vyhel"
              title="From the Vyhel shop"
              description="Digital products we make ourselves. Pay with Razorpay, get your download by email instantly."
              href="/shop"
              hrefLabel="Visit the shop"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shop.map((p) => (
                <DigitalProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- GUIDES */}
      <section className="container-page py-14 md:py-20">
        <SectionHeader eyebrow="Editorial" title="Useful guides" href="/guides" hrefLabel="All guides" />
        {featureGuide ? (
          <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
            <GuideCard guide={featureGuide} variant="feature" />
            <div className="flex flex-col">
              {otherGuides.slice(0, 4).map((g) => (
                <GuideCard key={g.id} guide={g} variant="compact" />
              ))}
              {otherGuides.length === 0 ? <p className="border-t border-line py-5 text-sm text-muted">More guides on the way.</p> : null}
            </div>
          </div>
        ) : (
          <EmptyState title="New guides are on the way." />
        )}
      </section>

      {/* ------------------------------------------------------- WHY VYHEL */}
      <section className="container-page pt-14 md:pt-20">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-6 py-12 md:px-12 md:py-16">
          <h2 className="display text-[2.5rem] text-ink md:text-[3rem]">Why Vyhel?</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-12">
            {[
              ["01", "Useful over hype", "We focus on products that solve real problems — not whatever is loudest this week."],
              ["02", "Clear over complicated", "We explain what products are actually good for, who should buy them, and who should skip them."],
              ["03", "Recommendations, not pressure", "We share our reasoning and the trade-offs. You decide whether something is worth buying."],
            ].map(([n, title, body]) => (
              <div key={n} className="border-t border-line pt-5">
                <p className="text-xs font-medium tabular-nums text-accent">{n}</p>
                <h3 className="mt-3 text-lg font-medium text-ink">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
