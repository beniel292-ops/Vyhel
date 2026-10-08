import { AdminPageHeader } from "@/components/admin/kit";
import { getPickerOptions } from "@/server/queries/admin";
import { GuideForm } from "../GuideForm";

export const metadata = { title: "Write guide" };

export default async function NewGuide() {
  const options = await getPickerOptions();
  return (
    <>
      <AdminPageHeader title="Write a guide" back={{ href: "/admin/guides", label: "Guides" }} description="Original, useful writing. Not a list of links." />
      <GuideForm options={options} />
    </>
  );
}
