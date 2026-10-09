import Link from "next/link";
import { ConfirmButton } from "@/components/admin/form";
import { AdminPageHeader, Panel, Table, Td, Th } from "@/components/admin/kit";
import { requireUser } from "@/lib/auth/session";
import { deleteCategory } from "@/server/actions/categories";
import { getPickerOptions, listAdminCategories } from "@/server/queries/admin";
import { CategoryForm } from "./CategoryForm";

export const metadata = { title: "Categories" };

export default async function AdminCategories({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [user, rows, opts] = await Promise.all([requireUser(), listAdminCategories(), getPickerOptions()]);
  const editing = rows.find((r) => r.category.id === edit)?.category;
  return (
    <>
      <AdminPageHeader title="Categories" description="The top-level ways people browse Vyhel." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Table className="self-start">
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Category</Th>
              <Th>Products</Th>
              <Th>Featured</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-sm text-muted">
                  No categories yet. Create your first one with the form — product forms list them for you to choose.
                </Td>
              </tr>
            ) : null}
            {rows.map(({ category: c, productCount }) => (
              <tr key={c.id} className={c.id === edit ? "bg-accent-soft/40" : "hover:bg-canvas/60"}>
                <Td className="tabular-nums">{c.sortOrder}</Td>
                <Td>
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="block text-xs text-muted">/categories/{c.slug}</span>
                </Td>
                <Td className="tabular-nums">{productCount}</Td>
                <Td>{c.featured ? "Yes" : "—"}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/categories?edit=${c.id}`} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Edit</Link>
                  <Link href={`/categories/${c.slug}`} target="_blank" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">View</Link>
                  {user.role === "admin" ? (
                    productCount === 0 ? (
                      <ConfirmButton action={deleteCategory} fields={{ id: c.id }} label="Delete" title="Delete category?" body={`“${c.name}” will be removed.`} confirmLabel="Delete" className="!h-auto !px-2 !py-1 !text-[12.5px] text-danger" />
                    ) : (
                      <span className="px-2 text-[12px] text-faint" title="Move its products to another category first">In use</span>
                    )
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Panel title={editing ? `Edit “${editing.name}”` : "New category"}>
          <CategoryForm key={editing?.id ?? "new"} category={editing} media={opts.media} />
        </Panel>
      </div>
    </>
  );
}
