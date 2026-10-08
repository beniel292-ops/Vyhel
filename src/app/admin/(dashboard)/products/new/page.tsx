import { AdminPageHeader } from "@/components/admin/kit";
import { getSettings } from "@/lib/settings";
import { getPickerOptions } from "@/server/queries/admin";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  const [options, settings] = await Promise.all([getPickerOptions(), getSettings()]);
  return (
    <>
      <AdminPageHeader title="New affiliate product" back={{ href: "/admin/products", label: "Affiliate products" }} />
      <ProductForm options={options} associateId={settings.amazonAssociateId} />
    </>
  );
}
