import Link from "next/link";
import { AdminPageHeader, NoData, Panel, Stat, StatusPill, When } from "@/components/admin/kit";
import { QuickAddProduct } from "@/components/admin/QuickAddProduct";
import { buttonClasses } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatNumber, greeting } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { getOverview, getPickerOptions } from "@/server/queries/admin";
import { digitalSalesSummary } from "@/server/services/digital-orders";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const [user, o, opts, settings, sales] = await Promise.all([requireUser(), getOverview(), getPickerOptions(), getSettings(), digitalSalesSummary(30)]);
  const first = (user.name || "").split(" ")[0];
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Vyhel Admin</p>
      <AdminPageHeader
        title={`${greeting().replace(".", "")}${first ? `, ${first}` : ""}.`}
        description="Here's where things stand."
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/admin/digital-products/new" className={buttonClasses("primary", "md")}>
          <PlusIcon size={15} /> Add Digital Product
        </Link>
        <QuickAddProduct categories={opts.categories} media={opts.media} associateId={settings.amazonAssociateId} label="Add Affiliate Product" variant="secondary" />
        <Link href="/admin/guides/new" className={buttonClasses("secondary", "md")}>
          <PlusIcon size={15} /> Write Guide
        </Link>
        <Link href="/admin/collections/new" className={buttonClasses("secondary", "md")}>
          <PlusIcon size={15} /> Create Collection
        </Link>
      </div>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Digital sales</p>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue · 30 days" value={sales.allOrders ? formatMoney(sales.revenueMinor) : "—"} hint={sales.allOrders ? undefined : "No sales yet"} href="/admin/orders" />
        <Stat label="Paid orders · 30 days" value={sales.orders} hint={`${sales.allOrders} all time`} href="/admin/orders?payment=paid" />
        <Stat label="Delivery issues" value={sales.deliveryIssues} hint={sales.deliveryIssues ? "Needs a resend" : "All delivered"} href={sales.deliveryIssues ? "/admin/orders?payment=paid&delivery=failed" : undefined} />
        <Stat label="Digital products" value={<Link href="/admin/digital-products" className="hover:underline">Manage →</Link>} />
      </div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Affiliate &amp; content</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Affiliate products" value={o.products.published} hint={`${o.products.total} total · ${o.products.drafts} drafts`} href="/admin/products" />
        <Stat label="Guides" value={o.guides.published} hint={`${o.guides.total} total`} href="/admin/guides" />
        <Stat
          label="Amazon clicks · 7 days"
          value={o.clicksAll === 0 ? "—" : formatNumber(o.clicksWeek)}
          hint={o.clicksAll === 0 ? "No data yet" : `${formatNumber(o.clicksAll)} all time`}
          href="/admin/analytics"
        />
        <Stat
          label="Top product · 30 days"
          value={o.topProduct ? <span className="text-base">{o.topProduct.name}</span> : "—"}
          hint={o.topProduct ? `${formatNumber(o.topProduct.clicks)} ${o.topProduct.clicks === 1 ? "click" : "clicks"}` : "No data yet"}
          href={o.topProduct ? `/admin/products/${o.topProduct.id}` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent activity">
          {o.recent.length === 0 ? (
            <NoData>No activity yet. Changes you make will be logged here.</NoData>
          ) : (
            <ul className="divide-y divide-line-soft">
              {o.recent.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5 text-[13px]">
                  <span className="mt-0.5 w-20 shrink-0 text-xs text-muted">
                    <When date={a.createdAt} />
                  </span>
                  <span className="min-w-0 flex-1 text-ink-soft">
                    <span className="font-medium text-ink">{a.userEmail?.split("@")[0] ?? "system"}</span>{" "}
                    {a.action.replace(":", " → ").replace(/_/g, " ")} {a.entityType.replace("_", " ")}
                    {a.summary ? <span className="text-muted"> · {a.summary}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Needs attention" action={<Link href="/admin/affiliate-links" className="text-xs text-muted hover:text-ink">Links →</Link>}>
            {o.attention.length === 0 ? (
              <NoData>Every published product has a verified link.</NoData>
            ) : (
              <ul className="space-y-2">
                {o.attention.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <Link href={`/admin/products/${p.id}`} className="min-w-0 truncate text-ink hover:underline">
                      {p.name}
                    </Link>
                    <StatusPill status={p.linkStatus ?? "missing"} label={p.linkStatus ? `${p.linkStatus} link` : "no link"} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Content">
            <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
              <dt className="text-muted">Collections</dt>
              <dd className="text-right text-ink">{o.collections.published} live / {o.collections.total}</dd>
              <dt className="text-muted">Categories</dt>
              <dd className="text-right text-ink">{o.categories}</dd>
              <dt className="text-muted">Top guide · 30d</dt>
              <dd className="truncate text-right text-ink">{o.topGuide ? o.topGuide.title : "No data yet"}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
