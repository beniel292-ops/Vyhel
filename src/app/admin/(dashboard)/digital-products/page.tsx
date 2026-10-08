import Link from "next/link";
import { ConfirmButton, RowAction } from "@/components/admin/form";
import { AdminPageHeader, FilterForm, RowMenu, StatusPill, Table, Td, Th, When } from "@/components/admin/kit";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/money";
import { getRazorpayConfig } from "@/lib/payments/razorpay";
import { removeDigitalProduct, setDigitalProductStatus } from "@/server/actions/digital";
import { adminListDigitalProducts } from "@/server/services/digital-products";

export const metadata = { title: "Digital products" };

export default async function DigitalProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const [user, rows] = await Promise.all([requireUser(), adminListDigitalProducts({ q: sp.q, status: sp.status })]);
  const totalRevenue = rows.reduce((a, r) => a + r.revenueMinor, 0);
  const totalSales = rows.reduce((a, r) => a + r.sales, 0);
  const payments = Boolean(getRazorpayConfig());
  return (
    <>
      <AdminPageHeader
        title="Digital products"
        description={<>Sold directly by Vyhel through Razorpay · {totalSales} paid {totalSales === 1 ? "sale" : "sales"} · {formatMoney(totalRevenue)} revenue</>}
        actions={<Link href="/admin/digital-products/new" className={buttonClasses("primary", "md")}><PlusIcon size={15} /> Add digital product</Link>}
      />
      {!payments ? (
        <p className="mb-4 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          Razorpay isn&rsquo;t configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable checkout.
        </p>
      ) : null}
      <FilterForm>
        <input name="q" defaultValue={sp.q} placeholder="Search digital products…" className="input h-9 !w-64 !py-1" aria-label="Search" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-9 !w-auto !py-1" aria-label="Status">
          <option value="">All (not archived)</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </FilterForm>
      {rows.length === 0 ? (
        <EmptyState title="No digital products yet." description="Add a product, upload its file, set a price, then activate it." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Status</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">Sales</Th>
              <Th className="text-right">Revenue</Th>
              <Th>File</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-canvas/60">
                <Td className="max-w-[16rem]">
                  <Link href={`/admin/digital-products/${p.id}`} className="block truncate font-medium text-ink hover:underline">{p.name}</Link>
                  <span className="text-xs text-muted">/shop/{p.slug}</span>
                </Td>
                <Td><StatusPill status={p.status} /></Td>
                <Td className="text-right tabular-nums">{formatMoney(p.priceMinor, p.currency)}</Td>
                <Td className="text-right tabular-nums">{p.sales}</Td>
                <Td className="text-right tabular-nums">{formatMoney(p.revenueMinor, p.currency)}</Td>
                <Td className="max-w-[10rem] truncate text-xs">{p.fileName ?? <StatusPill status="missing" label="No file" />}</Td>
                <Td className="whitespace-nowrap text-xs"><When date={p.createdAt} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/digital-products/${p.id}`} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Edit</Link>
                  {p.status === "active" ? (
                    <>
                      <Link href={`/shop/${p.slug}`} target="_blank" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">View</Link>
                      <RowAction action={setDigitalProductStatus} fields={{ id: p.id, status: "inactive" }}>Deactivate</RowAction>
                    </>
                  ) : p.fileId ? (
                    <RowAction action={setDigitalProductStatus} fields={{ id: p.id, status: "active" }} className="text-accent-strong">Activate</RowAction>
                  ) : null}
                  <RowMenu>
                    <Link href={`/admin/orders?q=${encodeURIComponent(p.name)}`} className="block rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">View orders</Link>
                    {p.status !== "archived" ? <RowAction action={setDigitalProductStatus} fields={{ id: p.id, status: "archived" }}>Archive</RowAction> : null}
                    {user.role === "admin" ? (
                      <ConfirmButton
                        action={removeDigitalProduct}
                        fields={{ id: p.id }}
                        label={p.sales > 0 ? "Archive (has orders)" : "Delete"}
                        title={p.sales > 0 ? "Archive this product?" : "Delete permanently?"}
                        body={p.sales > 0 ? "It has orders, so it will be archived instead of deleted. Existing customers keep their downloads." : `“${p.name}” will be removed. This can't be undone.`}
                        confirmLabel={p.sales > 0 ? "Archive" : "Delete"}
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
    </>
  );
}
