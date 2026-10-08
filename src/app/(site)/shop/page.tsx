import Link from "next/link";
import type { Metadata } from "next";
import { DigitalProductCard } from "@/components/site/DigitalCards";
import { PageHeader } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { listPublicDigitalProducts } from "@/server/services/digital-products";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Shop",
  description: "Digital products made and sold by Vyhel — delivered instantly to your email.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const items = await listPublicDigitalProducts();
  return (
    <>
      <PageHeader eyebrow="Shop · Sold by Vyhel" title="Made by Vyhel." description="Guides, templates and toolkits we make ourselves. Pay securely with Razorpay and get your download by email straight away." />
      <div className="container-page">
        {items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <DigitalProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="New products are on the way." description="Our first digital products are being finished." />
        )}
        <p className="mt-10 text-[13px] text-muted">
          Looking for product recommendations instead? Those are on <Link className="underline underline-offset-4" href="/products">Discover</Link> — you buy them from the retailer, not from Vyhel.
        </p>
      </div>
    </>
  );
}
