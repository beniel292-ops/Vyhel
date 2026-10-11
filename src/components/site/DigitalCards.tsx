import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { PublicDigitalProduct } from "@/server/services/digital-products";
import { EditorialImage } from "./Media";

export function DigitalProductCard({ product }: { product: PublicDigitalProduct }) {
  return (
    <article className="group relative flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-3 transition-colors hover:border-ink/30">
      <EditorialImage src={product.imageUrl} alt={product.imageAlt} name={product.name} className="aspect-[4/3] w-full" label="Digital download" fit="contain" />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow !text-accent">By Vyhel · Digital</p>
          <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(product.priceMinor, product.currency)}</p>
        </div>
        <h3 className="mt-2 text-base font-medium leading-snug text-ink">
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{product.shortDescription}</p>
        <span className="mt-auto pt-4 text-[13px] font-medium text-ink underline-offset-4 group-hover:underline">Get this product →</span>
      </div>
    </article>
  );
}
