import { notFound } from "next/navigation";
import { PreviewFrame } from "@/components/admin/PreviewFrame";
import { ProductDetailView } from "@/components/site/ProductDetailView";
import { getSettings } from "@/lib/settings";
import { getProductDetailById } from "@/server/queries/public";

export const metadata = { title: "Preview" };

export default async function ProductPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [detail, settings] = await Promise.all([getProductDetailById(id), getSettings()]);
  if (!detail) notFound();
  return (
    <PreviewFrame status={detail.product.status} editHref={`/admin/products/${id}`} settings={settings}>
      <ProductDetailView detail={detail} settings={settings} preview />
    </PreviewFrame>
  );
}
