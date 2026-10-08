import Link from "next/link";
import { ConfirmButton, RowAction } from "@/components/admin/form";
import { AdminPageHeader, DemoPill, FilterForm, Pagination, RowMenu, StatusPill, Table, Td, Th, When } from "@/components/admin/kit";
import { QuickAddProduct } from "@/components/admin/QuickAddProduct";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatScore } from "@/lib/utils";
import { deleteProduct, duplicateProduct, setProductStatus } from "@/server/actions/products";
import { getPickerOptions, listAdminProducts } from "@/server/queries/admin";

export const metadata = { title: "Affiliate products" };

type SP = Promise<Record<string, string | undefined>>;

export default async function AdminProducts({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [user, { rows, total, pages }, opts, settings] = await Promise.all([
    requireUser(),
    listAdminProducts({ q: sp.q, status: sp.status, category: sp.category, link: sp.link, page }),
    getPickerOptions(),
    getSettings(),
  ]);
  const hrefFor = (p: number) => `/admin/products?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(p) })}`;

  return (
    <>
      <AdminPageHeader
        title="Affiliate products"
        description={`${total} ${total === 1 ? "product" : "products"}${sp.status ? ` · ${sp.status}` : ""} · recommended by Vyhel, bought on Amazon or another merchant`}
        actions={
          <>
            <Link href="/admin/products/new" className={buttonClasses("secondary", "md")}>Full editor</Link>
            <QuickAddProduct categories={opts.categories} media={opts.media} associateId={settings.amazonAssociateId} label="Add affiliate product" />
          </>
        }
      />
      <FilterForm>
        <input name="q" defaultValue={sp.q} placeholder="Search name, slug or ASIN…" className="input h-9 !w-64 !py-1" aria-label="Search products" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-9 !w-auto !py-1" aria-label="Status">
          <option value="">Active (not archived)</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select name="category" defaultValue={sp.category ?? ""} className="input h-9 !w-auto !py-1" aria-label="Category">
          <option value="">All categories</option>
          {opts.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="link" defaultValue={sp.link ?? ""} className="input h-9 !w-auto !py-1" aria-label="Link status">
          <option value="">Any link status</option>
          <option value="verified">Verified link</option>
          <option value="unverified">Unverified link</option>
          <option value="broken">Broken link</option>
          <option value="missing">No link</option>
        </select>
      </FilterForm>

      {rows.length === 0 ? (
        <EmptyState title="No products here yet." description="Add your first product — it takes about two minutes." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Score</Th>
              <Th>Amazon link</Th>
              <Th>Created</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-canvas/60">
                <Td className="max-w-[16rem]">
                  <Link href={`/admin/products/${p.id}`} className="block truncate font-medium text-ink hover:underline">
                    {p.name}
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    /{p.slug} {p.isDemo ? <DemoPill /> : null}
                  </span>
                </Td>
                <Td>{p.categoryName ?? <span className="text-faint">—</span>}</Td>
                <Td><StatusPill status={p.status} /></Td>
                <Td className="tabular-nums">{formatScore(p.vyhelScore) ?? "—"}</Td>
                <Td><StatusPill status={p.linkStatus ?? "missing"} label={p.linkStatus ?? "missing"} /></Td>
                <Td className="whitespace-nowrap text-xs"><When date={p.createdAt} /></Td>
                <Td className="whitespace-nowrap text-xs"><When date={p.updatedAt} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/products/${p.id}`} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Edit</Link>
                  <Link href={`/admin/products/${p.id}/preview`} target="_blank" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Preview</Link>
                  {p.status === "published" ? (
                    <RowAction action={setProductStatus} fields={{ id: p.id, status: "draft" }}>Unpublish</RowAction>
                  ) : (
                    <RowAction action={setProductStatus} fields={{ id: p.id, status: "published" }} className="text-accent-strong">Publish</RowAction>
                  )}
                  <RowMenu>
                  <RowAction action={duplicateProduct} fields={{ id: p.id }}>Duplicate</RowAction>
                  {p.status !== "archived" ? (
                    <RowAction action={setProductStatus} fields={{ id: p.id, status: "archived" }}>Archive</RowAction>
                  ) : user.role === "admin" ? (
                    <ConfirmButton
                      action={deleteProduct}
                      fields={{ id: p.id }}
                      label="Delete"
                      title="Delete permanently?"
                      body={`“${p.name}” and its click history links will be removed. This can't be undone.`}
                      confirmLabel="Delete forever"
                      className="!h-auto !w-full !justify-start !px-2 !py-1 !text-[12.5px] text-danger"
                    />
                  ) : null}
                  </RowMenu>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pages={pages} hrefFor={hrefFor} />
    </>
  );
}
