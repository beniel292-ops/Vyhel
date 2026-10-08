import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, DemoPill, StatusPill } from "@/components/admin/kit";
import { getCollectionForEdit, getPickerOptions } from "@/server/queries/admin";
import { CollectionForm } from "../CollectionForm";

export const metadata = { title: "Edit collection" };

export default async function EditCollection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [data, options] = await Promise.all([getCollectionForEdit(id), getPickerOptions()]);
  if (!data) notFound();
  const c = data.collection;
  return (
    <>
      <AdminPageHeader
        title={c.name}
        back={{ href: "/admin/collections", label: "Collections" }}
        description={
          <span className="flex items-center gap-2">
            <StatusPill status={c.status} />
            {c.isDemo ? <DemoPill /> : null}
            {c.status === "published" ? <Link href={`/collections/${c.slug}`} target="_blank" className="underline underline-offset-2">View live ↗</Link> : null}
          </span>
        }
      />
      <CollectionForm key={c.updatedAt.toISOString()} collection={c} items={data.items} guideIds={data.guideIds} options={options} />
    </>
  );
}
