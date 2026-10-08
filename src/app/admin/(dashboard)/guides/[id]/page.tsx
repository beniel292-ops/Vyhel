import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, DemoPill, StatusPill } from "@/components/admin/kit";
import { getGuideForEdit, getPickerOptions } from "@/server/queries/admin";
import { GuideForm } from "../GuideForm";

export const metadata = { title: "Edit guide" };

export default async function EditGuide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [data, options] = await Promise.all([getGuideForEdit(id), getPickerOptions()]);
  if (!data) notFound();
  const g = data.guide;
  return (
    <>
      <AdminPageHeader
        title={g.title}
        back={{ href: "/admin/guides", label: "Guides" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={g.status} label={g.status === "review" ? "In review" : undefined} />
            {g.isDemo ? <DemoPill /> : null}
            {g.status === "published" ? <Link href={`/guides/${g.slug}`} target="_blank" className="underline underline-offset-2">View live ↗</Link> : null}
          </span>
        }
      />
      <GuideForm key={g.updatedAt.toISOString()} guide={g} productIds={data.productIds} relatedIds={data.relatedIds} extraCategoryIds={data.extraCategoryIds} options={options} />
    </>
  );
}
