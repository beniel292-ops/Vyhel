import { AdminPageHeader } from "@/components/admin/kit";
import { getPickerOptions } from "@/server/queries/admin";
import { CollectionForm } from "../CollectionForm";

export const metadata = { title: "Create collection" };

export default async function NewCollection() {
  const options = await getPickerOptions();
  return (
    <>
      <AdminPageHeader title="Create collection" back={{ href: "/admin/collections", label: "Collections" }} />
      <CollectionForm options={options} />
    </>
  );
}
