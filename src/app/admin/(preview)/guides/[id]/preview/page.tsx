import { notFound } from "next/navigation";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { GuideDetailView } from "@/components/site/GuideDetailView";
import { getSettings } from "@/lib/settings";
import { getGuideDetail } from "@/server/queries/public";

export const metadata = { title: "Preview" };

export default async function GuidePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [detail, settings] = await Promise.all([getGuideDetail("", { id, includeUnpublished: true }), getSettings()]);
  if (!detail) notFound();
  return (
    <PreviewFrame status={detail.guide.status} editHref={`/admin/guides/${id}`} settings={settings}>
      <GuideDetailView detail={detail} settings={settings} preview />
    </PreviewFrame>
  );
}
