import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, DemoPill, StatusPill } from "@/components/admin/kit";
import { getSettings } from "@/lib/settings";
import { getPickerOptions, getProductForEdit } from "@/server/queries/admin";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [data, options, settings] = await Promise.all([getProductForEdit(id), getPickerOptions(), getSettings()]);
  if (!data) notFound();
  const p = data.product;
  return (
    <>
      <AdminPageHeader
        title={p.name}
        back={{ href: "/admin/products", label: "Affiliate products" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={p.status} />
            {p.isDemo ? <DemoPill /> : null}
            {p.status === "published" ? (
              <Link href={`/products/${p.slug}`} target="_blank" className="underline underline-offset-2">
                View live ↗
              </Link>
            ) : null}
          </span>
        }
      />
      <ProductForm
        key={p.updatedAt.toISOString()}
        product={p}
        link={data.link}
        collectionIds={data.collectionIds}
        guideIds={data.guideIds}
        relatedIds={data.relatedIds}
        options={options}
        associateId={settings.amazonAssociateId}
      />
    </>
  );
}
