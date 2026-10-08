import { notFound } from "next/navigation";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { CollectionDetailView } from "@/components/site/CollectionDetailView";
import { getSettings } from "@/lib/settings";
import { getCollectionDetail } from "@/server/queries/public";

export const metadata = { title: "Preview" };

export default async function CollectionPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [detail, settings] = await Promise.all([getCollectionDetail("", { id, includeUnpublished: true }), getSettings()]);
  if (!detail) notFound();
  return (
    <PreviewFrame status={detail.collection.status} editHref={`/admin/collections/${id}`} settings={settings}>
      <CollectionDetailView detail={detail} settings={settings} preview />
    </PreviewFrame>
  );
}
