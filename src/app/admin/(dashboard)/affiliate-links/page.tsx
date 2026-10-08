import Link from "next/link";
import { ConfirmButton, RowAction } from "@/components/admin/form";
import { AdminPageHeader, FilterForm, StatusPill, Table, Td, Th, When } from "@/components/admin/kit";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSettings } from "@/lib/settings";
import { deleteAffiliateLink, markLinkChecked } from "@/server/actions/affiliate";
import { getPickerOptions, listAffiliateLinks } from "@/server/queries/admin";
import { AddLinkButton, EditLinkButton } from "./LinkModals";

export const metadata = { title: "Affiliate links" };

export default async function AffiliateLinksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [rows, opts, settings] = await Promise.all([listAffiliateLinks({ q: sp.q, status: sp.status }), getPickerOptions(), getSettings()]);
  const products = opts.products.map((p) => ({ id: p.id, name: p.name }));
  return (
    <>
      <AdminPageHeader
        title="Affiliate links"
        description="Every merchant link on Vyhel. The public CTA uses each product's primary link."
        actions={<AddLinkButton products={products} associateId={settings.amazonAssociateId} />}
      />
      <ol className="mb-6 grid gap-2 rounded-lg border border-line bg-surface p-4 text-[13px] text-ink-soft sm:grid-cols-3 lg:grid-cols-6">
        {["Create the product", "Generate the Special Link in Amazon Associates", "Paste it into Vyhel", "Save", "Test the destination", "Mark verified, then publish"].map((s, i) => (
          <li key={s} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sunken text-[11px] font-semibold text-ink">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <FilterForm>
        <input name="q" defaultValue={sp.q} placeholder="Search product, link or ASIN…" className="input h-9 !w-64 !py-1" aria-label="Search links" />
        <select name="status" defaultValue={sp.status ?? ""} className="input h-9 !w-auto !py-1" aria-label="Status">
          <option value="">All statuses</option>
          <option value="unverified">Unverified</option>
          <option value="verified">Verified</option>
          <option value="broken">Broken</option>
        </select>
      </FilterForm>
      {rows.length === 0 ? (
        <EmptyState title="No links yet." description="Links are created when you add a product with its Special Link." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Special Link</Th>
              <Th>Tag</Th>
              <Th>Status</Th>
              <Th>Last checked</Th>
              <Th>Clicks · 30d</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ link, productName, productSlug, productStatus, clicks30 }) => (
              <tr key={link.id} className="hover:bg-canvas/60">
                <Td className="max-w-[14rem]">
                  <span className="block truncate font-medium text-ink">{productName}</span>
                  <span className="text-xs text-muted">
                    {link.merchant}
                    {link.isPrimary ? " · primary" : ""} · product {productStatus}
                  </span>
                </Td>
                <Td className="max-w-[16rem]">
                  <a href={link.specialLink} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-[12px] text-ink-soft underline-offset-2 hover:underline" title={link.specialLink}>
                    {link.specialLink.replace(/^https:\/\//, "")}
                  </a>
                  {link.notes ? <span className="block truncate text-xs text-muted">{link.notes}</span> : null}
                </Td>
                <Td className="font-mono text-[12px]">{link.associateTag ?? <span className="text-faint">—</span>}</Td>
                <Td><StatusPill status={link.status} /></Td>
                <Td className="text-xs"><When date={link.lastCheckedAt} /></Td>
                <Td className="tabular-nums">{clicks30}</Td>
                <Td className="whitespace-nowrap text-right">
                  <a href={link.specialLink} target="_blank" rel="noopener noreferrer" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Test ↗</a>
                  {link.status !== "verified" ? (
                    <RowAction action={markLinkChecked} fields={{ id: link.id, status: "verified" }} className="text-accent-strong">Mark verified</RowAction>
                  ) : null}
                  {link.status !== "broken" ? <RowAction action={markLinkChecked} fields={{ id: link.id, status: "broken" }}>Mark broken</RowAction> : null}
                  <EditLinkButton link={link} products={products} associateId={settings.amazonAssociateId} />
                  <Link href={`/products/${productSlug}`} target="_blank" className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">Page</Link>
                  <ConfirmButton action={deleteAffiliateLink} fields={{ id: link.id }} label="Delete" title="Delete this link?" body="The product will have no merchant link until you add one." confirmLabel="Delete" className="!h-auto !px-2 !py-1 !text-[12.5px] text-danger" />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-4 text-xs text-muted">
        Vyhel never generates, shortens, cloaks or rewrites affiliate links. Visitors are sent directly to the link you paste, marked as a paid link.
      </p>
    </>
  );
}
