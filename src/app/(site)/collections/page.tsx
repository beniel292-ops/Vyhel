import type { Metadata } from "next";
import { CollectionCard } from "@/components/site/Cards";
import { PageHeader } from "@/components/site/bits";
import { EmptyState } from "@/components/ui/EmptyState";
import { listCollections } from "@/server/queries/public";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Collections",
  description: "Curated sets of products built around real situations — a student desk, a first car, a creator setup.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await listCollections();
  return (
    <>
      <PageHeader eyebrow="Collections" title="Curated around how you live." description="Small, considered sets of products built around a situation, not a sale." />
      <div className="container-page">
        {collections.length ? (
          <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {collections.map((c, i) => (
              <div key={c.id} className={i === 0 ? "md:col-span-2" : undefined}>
                <CollectionCard collection={c} large={i === 0} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Collections are being curated." />
        )}
      </div>
    </>
  );
}
