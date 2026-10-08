import Link from "next/link";
import { ConfirmButton, RowAction } from "@/components/admin/form";
import { AdminPageHeader, DemoPill, StatusPill, Table, Td, Th, When } from "@/components/admin/kit";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { deleteCollection, setCollectionStatus } from "@/server/actions/collections";
import { listAdminCollections } from "@/server/queries/admin";

export const metadata = { title: "Collections" };

export default async function AdminCollections() {
  const [user, rows] = await Promise.all([requireUser(), listAdminCollections()]);
  return (
    <>
      <AdminPageHeader
        title="Collections"
        description="Curated sets of products. Lower sort order appears first."
        actions={<Link href="/admin/collections/new" className={buttonClasses("primary", "md")}><PlusIcon size={15} /> Create Collection</Link>}
      />
      {rows.length === 0 ? (
        <EmptyState title="No collections yet." description="Group products around a situation — a student desk, a first car." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Collection</Th>
              <Th>Status</Th>
              <Th>Products</Th>
              <Th>Featured</Th>
              <Th>Order</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-canvas/60">
                <Td>
                  <Link href={`/admin/collections/${c.id}`} className="font-medium text-ink hover:underline">{c.name}</Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted">/collections/{c.slug} {c.isDemo ? <DemoPill /> : null}</span>
                </Td>
                <Td><StatusPill status={c.status} /></Td>
                <Td className="tabular-nums">{c.productCount}</Td>
                <Td>{c.featured ? "Yes" : <span className="text-faint">—</span>}</Td>
                <Td className="tabular-nums">{c.sortOrder}</Td>
                <Td className="text-xs"><When date={c.updatedAt} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/collections/${c.id}`} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Edit</Link>
                  <Link href={`/admin/collections/${c.id}/preview`} target="_blank" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Preview</Link>
                  {c.status === "published" ? (
                    <RowAction action={setCollectionStatus} fields={{ id: c.id, status: "draft" }}>Unpublish</RowAction>
                  ) : c.productCount > 0 ? (
                    <RowAction action={setCollectionStatus} fields={{ id: c.id, status: "published" }} className="text-accent-strong">Publish</RowAction>
                  ) : null}
                  {user.role === "admin" ? (
                    <ConfirmButton action={deleteCollection} fields={{ id: c.id }} label="Delete" title="Delete collection?" body={`“${c.name}” will be removed. Its products are not affected.`} confirmLabel="Delete" className="!h-auto !px-2 !py-1 !text-[12.5px] text-danger" />
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
