import Link from "next/link";
import { ConfirmButton, RowAction } from "@/components/admin/form";
import { AdminPageHeader, DemoPill, FilterForm, StatusPill, Table, Td, Th, When } from "@/components/admin/kit";
import { GUIDE_TYPE_LABELS } from "@/components/site/bits";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { deleteGuide, setGuideStatus } from "@/server/actions/guides";
import { listAdminGuides } from "@/server/queries/admin";

export const metadata = { title: "Guides" };

export default async function AdminGuides({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [user, rows] = await Promise.all([requireUser(), listAdminGuides({ q: sp.q, status: sp.status })]);
  return (
    <>
      <AdminPageHeader
        title="Guides"
        description={`${rows.length} ${rows.length === 1 ? "guide" : "guides"}`}
        actions={
          <Link href="/admin/guides/new" className={buttonClasses("primary", "md")}>
            <PlusIcon size={15} /> Write Guide
          </Link>
        }
      />
      <FilterForm>
        <input name="q" defaultValue={sp.q} placeholder="Search titles…" className="input h-9 !w-64 !py-1" aria-label="Search guides" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-9 !w-auto !py-1" aria-label="Status">
          <option value="">Active (not archived)</option>
          <option value="draft">Draft</option>
          <option value="review">In review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </FilterForm>
      {rows.length === 0 ? (
        <EmptyState title="New guides are on the way." description="Write your first guide to start building Vyhel's editorial library." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Guide</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Products</Th>
              <Th>Published</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="hover:bg-canvas/60">
                <Td className="max-w-[20rem]">
                  <Link href={`/admin/guides/${g.id}`} className="block truncate font-medium text-ink hover:underline">{g.title}</Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted">{g.categoryName ?? "No category"} · {g.readingTime ?? "?"} min {g.isDemo ? <DemoPill /> : null}</span>
                </Td>
                <Td className="whitespace-nowrap">{GUIDE_TYPE_LABELS[g.guideType]}</Td>
                <Td><StatusPill status={g.status} label={g.status === "review" ? "In review" : undefined} /></Td>
                <Td className="tabular-nums">{g.productCount}</Td>
                <Td className="whitespace-nowrap text-xs"><When date={g.publishedAt} /></Td>
                <Td className="whitespace-nowrap text-xs"><When date={g.updatedAt} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/guides/${g.id}`} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Edit</Link>
                  <Link href={`/admin/guides/${g.id}/preview`} target="_blank" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Preview</Link>
                  {g.status === "published" ? (
                    <RowAction action={setGuideStatus} fields={{ id: g.id, status: "draft" }}>Unpublish</RowAction>
                  ) : g.status !== "archived" ? (
                    <RowAction action={setGuideStatus} fields={{ id: g.id, status: "published" }} className="text-accent-strong">Publish</RowAction>
                  ) : null}
                  {g.status !== "archived" ? (
                    <RowAction action={setGuideStatus} fields={{ id: g.id, status: "archived" }}>Archive</RowAction>
                  ) : user.role === "admin" ? (
                    <ConfirmButton action={deleteGuide} fields={{ id: g.id }} label="Delete" title="Delete permanently?" body={`“${g.title}” will be removed. This can't be undone.`} confirmLabel="Delete forever" className="!h-auto !px-2 !py-1 !text-[12.5px] text-danger" />
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
