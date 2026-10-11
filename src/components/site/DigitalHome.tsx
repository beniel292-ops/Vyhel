import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import type { SiteSettings } from "@/lib/settings-shape";
import type { PublicDigitalProduct } from "@/server/services/digital-products";
import { EditorialImage } from "./Media";

/**
 * Home page used in Razorpay review mode (docs/razorpay-review-mode.md): Vyhel's own digital products only.
 * Every name, price, description and "what's included" line comes from the products' database records.
 */
export function DigitalHome({ settings, products }: { settings: SiteSettings; products: PublicDigitalProduct[] }) {
  return (
    <>
      <section className="container-page pb-12 pt-10 md:pb-16 md:pt-16 lg:pt-20">
        <div className="max-w-3xl animate-fade-up">
          <p className="eyebrow mb-6">Digital products · Sold by {settings.siteName}</p>
          <h1 className="display text-[3rem] leading-[1.02] text-ink sm:text-[4rem] lg:text-[5rem]">Practical guides that get you unstuck.</h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-[17px]">
            {settings.siteName} writes and sells downloadable guides for Indian students and beginner developers. Pay securely
            with Razorpay and get your download link by email straight away — no account needed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={products.length ? "#products" : "/shop"} size="lg">
              See the products
            </ButtonLink>
            <ButtonLink href="/delivery-policy" variant="secondary" size="lg">
              How delivery works
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="products" className="container-page scroll-mt-24 py-10 md:py-14">
        {products.length ? (
          <div className="grid gap-8 lg:grid-cols-2">
            {products.map((p) => (
              <article key={p.id} className="group relative flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-ink/30 sm:flex-row sm:gap-6 sm:p-5">
                <EditorialImage
                  src={p.imageUrl}
                  alt={p.imageAlt}
                  name={p.name}
                  label="Digital download"
                  fit="contain"
                  className="aspect-[4/3] w-full shrink-0 sm:aspect-[3/4] sm:w-44"
                  sizes="(min-width: 640px) 176px, 100vw"
                />
                <div className="flex min-w-0 flex-1 flex-col pt-4 sm:pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-medium leading-snug text-ink">
                      <Link href={`/shop/${p.slug}`} className="after:absolute after:inset-0">
                        {p.name}
                      </Link>
                    </h2>
                    <p className="shrink-0 text-lg font-semibold tabular-nums text-ink">{formatMoney(p.priceMinor, p.currency)}</p>
                  </div>
                  {p.shortDescription ? <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{p.shortDescription}</p> : null}
                  {p.whatsIncluded.length ? (
                    <ul className="mt-4 space-y-1.5">
                      {p.whatsIncluded.slice(0, 4).map((w) => (
                        <li key={w} className="flex gap-2 text-[13.5px] text-ink-soft">
                          <CheckIcon size={16} className="mt-0.5 shrink-0 text-accent" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <span className="mt-auto pt-5 text-[13.5px] font-medium text-ink underline-offset-4 group-hover:underline">View details &amp; buy →</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="New products are on the way." description="Our first digital products are being finished." />
        )}
      </section>

      <section className="container-page pt-10 md:pt-16">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-6 py-10 md:px-12 md:py-14">
          <h2 className="display text-[2.25rem] text-ink md:text-[2.75rem]">How buying works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              ["01", "Choose a guide", "Every product page shows the price, what's inside and who it's for."],
              ["02", "Pay with Razorpay", "Pay on Razorpay's secure checkout. One-time payment, no subscription."],
              ["03", "Download instantly", "Your private download link appears straight away and is emailed to you."],
            ].map(([n, title, body]) => (
              <li key={n} className="border-t border-line pt-5">
                <p className="text-xs font-medium tabular-nums text-accent">{n}</p>
                <h3 className="mt-3 text-lg font-medium text-ink">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-line pt-5 text-[13.5px] text-muted">
            Read our <Link href="/delivery-policy" className="underline underline-offset-4">delivery policy</Link>,{" "}
            <Link href="/refund-policy" className="underline underline-offset-4">refund &amp; cancellation policy</Link> and{" "}
            <Link href="/terms" className="underline underline-offset-4">terms</Link>.
            {settings.contactEmail ? (
              <>
                {" "}Questions? Email <a href={`mailto:${settings.contactEmail}`} className="underline underline-offset-4">{settings.contactEmail}</a>.
              </>
            ) : (
              <> Questions? See our <Link href="/contact" className="underline underline-offset-4">contact page</Link>.</>
            )}
          </p>
        </div>
      </section>
    </>
  );
}
