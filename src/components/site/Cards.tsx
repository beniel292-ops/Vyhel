import Link from "next/link";
import type {
  CategoryCardData,
  CollectionCardData,
  GuideCardData,
  ProductCardData,
} from "@/server/queries/public";
import { ArrowRight } from "@/components/ui/icons";
import { cn, formatDate } from "@/lib/utils";
import { BADGE_LABELS, Badge, DemoTag, GUIDE_TYPE_LABELS, ScoreBadge } from "./bits";
import { EditorialImage } from "./Media";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <EditorialImage
          src={product.imageUrl}
          alt={product.imageAlt}
          name={product.name}
          tone={product.categorySlug}
          priority={priority}
          className="aspect-[4/5] w-full border border-line-soft transition-colors duration-200 group-hover:border-line"
        />
        {product.badge ? (
          <div className="absolute left-2.5 top-2.5">
            <Badge tone={product.badge === "editors_pick" ? "accent" : "neutral"}>{BADGE_LABELS[product.badge]}</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow truncate">{product.categoryName ?? "Uncategorised"}</p>
          <ScoreBadge score={product.vyhelScore} />
        </div>
        <h3 className="mt-1.5 text-[15px] font-medium leading-snug text-ink md:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{product.shortDescription}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink underline-offset-4 group-hover:underline">
            View product <ArrowRight size={13} />
          </span>
          {product.isDemo ? <DemoTag className="ml-auto" /> : null}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0, className }: { products: ProductCardData[]; priorityCount?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-4 gap-y-10 min-[360px]:grid-cols-2 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function CategoryCard({ category }: { category: CategoryCardData }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-3 transition-colors duration-200 hover:border-ink/30"
    >
      <EditorialImage
        src={category.image}
        alt={category.imageAlt}
        name={category.name}
        tone={category.slug}
        className="aspect-[4/3] w-full"
        sizes="(min-width: 1024px) 20vw, 50vw"
      />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink">{category.name}</h3>
          <span className="text-xs tabular-nums text-muted">
            {category.productCount} {category.productCount === 1 ? "product" : "products"}
          </span>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{category.description}</p>
      </div>
    </Link>
  );
}

export function CollectionCard({ collection, large }: { collection: CollectionCardData; large?: boolean }) {
  const preview = collection.previewProducts;
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-colors duration-200 hover:border-ink/30"
    >
      {collection.heroImage ? (
        <EditorialImage
          src={collection.heroImage}
          alt={collection.heroImageAlt}
          name={collection.name}
          rounded={false}
          className={cn("w-full", large ? "aspect-[16/10]" : "aspect-[4/3]")}
        />
      ) : (
        <div className={cn("grid grid-cols-3 gap-px bg-line-soft", large ? "aspect-[16/10]" : "aspect-[4/3]")}>
          {[0, 1, 2].map((i) => {
            const p = preview[i];
            return (
              <EditorialImage
                key={i}
                src={p?.imageUrl}
                alt={p?.imageAlt}
                name={p?.name ?? collection.name}
                rounded={false}
                className="h-full w-full"
                sizes="15vw"
              />
            );
          })}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">
          Collection · {collection.productCount} {collection.productCount === 1 ? "pick" : "picks"}
        </p>
        <h3 className={cn("display mt-2 text-ink", large ? "text-[2rem]" : "text-[1.625rem]")}>{collection.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{collection.tagline ?? collection.description}</p>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-medium text-ink underline-offset-4 group-hover:underline">
          Explore collection <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

export function GuideCard({ guide, variant = "default" }: { guide: GuideCardData; variant?: "default" | "feature" | "compact" }) {
  if (variant === "compact") {
    return (
      <Link href={`/guides/${guide.slug}`} className="group flex gap-4 border-t border-line py-5">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{guide.categoryName ?? GUIDE_TYPE_LABELS[guide.guideType]}</p>
          <h3 className="mt-1.5 text-base font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-4">
            {guide.title}
          </h3>
          <p className="mt-1.5 text-xs text-muted">
            {guide.readingTime ? `${guide.readingTime} min read` : null}
          </p>
        </div>
        <EditorialImage
          src={guide.heroImage}
          alt={guide.heroImageAlt}
          name={guide.title}
          tone={guide.categorySlug}
          className="aspect-square w-20 shrink-0"
          sizes="80px"
          compact
        />
      </Link>
    );
  }
  const feature = variant === "feature";
  return (
    <article className="group relative flex h-full flex-col">
      <EditorialImage
        src={guide.heroImage}
        alt={guide.heroImageAlt}
        name={guide.title}
        tone={guide.categorySlug}
        className={cn("w-full", feature ? "aspect-[16/10]" : "aspect-[3/2]")}
        sizes={feature ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
      />
      <div className="flex flex-1 flex-col pt-4">
        <p className="eyebrow flex flex-wrap items-center gap-x-2">
          <span>{guide.categoryName ?? "Guide"}</span>
          <span className="text-faint">·</span>
          <span>{GUIDE_TYPE_LABELS[guide.guideType]}</span>
        </p>
        <h3 className={cn("display mt-2 text-ink", feature ? "text-[2rem] md:text-[2.375rem]" : "text-[1.5rem]")}>
          <Link href={`/guides/${guide.slug}`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {guide.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{guide.excerpt}</p>
        <p className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-muted">
          {guide.publishedAt ? <time dateTime={new Date(guide.publishedAt).toISOString()}>{formatDate(guide.publishedAt)}</time> : null}
          {guide.readingTime ? <span>· {guide.readingTime} min read</span> : null}
          {guide.isDemo ? <DemoTag className="ml-auto" /> : null}
        </p>
      </div>
    </article>
  );
}

/** Wide, magazine-style collection feature: imagery left, story right. */
export function FeatureCollection({ collection }: { collection: CollectionCardData }) {
  const preview = collection.previewProducts;
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group grid overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-colors duration-200 hover:border-ink/30 md:grid-cols-[1.3fr_1fr]"
    >
      {collection.heroImage ? (
        <EditorialImage src={collection.heroImage} alt={collection.heroImageAlt} name={collection.name} rounded={false} className="aspect-[16/10] w-full md:aspect-auto md:min-h-[22rem]" sizes="(min-width: 768px) 55vw, 100vw" />
      ) : (
        <div className="grid aspect-[16/10] grid-cols-[1.4fr_1fr] grid-rows-2 gap-px bg-line-soft md:aspect-auto md:min-h-[22rem]">
          {[0, 1, 2].map((i) => {
            const p = preview[i];
            return (
              <EditorialImage
                key={i}
                src={p?.imageUrl}
                alt={p?.imageAlt}
                name={p?.name ?? collection.name}
                rounded={false}
                className={cn("h-full w-full", i === 0 && "row-span-2")}
                sizes="30vw"
              />
            );
          })}
        </div>
      )}
      <div className="flex flex-col justify-center p-6 md:p-10">
        <p className="eyebrow">
          Featured collection · {collection.productCount} {collection.productCount === 1 ? "pick" : "picks"}
        </p>
        <h3 className="display mt-3 text-[2.25rem] text-ink md:text-[3rem]">{collection.name}</h3>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{collection.tagline ?? collection.description}</p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 group-hover:underline">
          Explore collection <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
