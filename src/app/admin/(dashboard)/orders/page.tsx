import Link from "next/link";
import { AdminPageHeader, FilterForm, Pagination, Stat, StatusPill, Table, Td, Th } from "@/components/admin/kit";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireUser } from "@/lib/auth/session";
import { emailConfig } from "@/lib/email/resend";
import { formatMoney } from "@/lib/money";
import { adminListOrders, digitalSalesSummary } from "@/server/services/digital-orders";
import { ResendForm } from "./ResendForm";

export const metadata = { title: "Digital orders" };

const dt = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [user, { rows, total, pages }, summary] = await Promise.all([
    requireUser(),
    adminListOrders({ q: sp.q, payment: sp.payment, delivery: sp.delivery, page }),
    digitalSalesSummary(30),
  ]);
  const mail = emailConfig();
  const hrefFor = (p: number) => `/admin/orders?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(p) })}`;
  return (
    <>
      <AdminPageHeader title="Digital orders" description={`${total} ${total === 1 ? "order" : "orders"} · digital products only (affiliate purchases happen on the merchant's site)`} />
      {!mail.configured ? (
        <p className="mb-4 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          Email isn&rsquo;t configured (RESEND_API_KEY). Payments still work, but download emails will show as failed until it&rsquo;s set — then use &ldquo;Resend email&rdquo;.
        </p>
      ) : null}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue · 30 days" value={formatMoney(summary.revenueMinor)} />
        <Stat label="Paid orders · 30 days" value={summary.orders} />
        <Stat label="Paid orders · all time" value={summary.allOrders} />
        <Stat label="Delivery issues" value={summary.deliveryIssues} hint={summary.deliveryIssues ? "Paid but email not sent" : "All delivered"} href={summary.deliveryIssues ? "/admin/orders?payment=paid&delivery=failed" : undefined} />
      </div>
      <FilterForm>
        <input name="q" defaultValue={sp.q} placeholder="Email, product, order or payment ID…" className="input h-9 !w-72 !py-1" aria-label="Search orders" />
        <select name="payment" defaultValue={sp.payment ?? ""} className="input h-9 !w-auto !py-1" aria-label="Payment status">
          <option value="">Any payment</option>
          <option value="paid">Paid</option>
          <option value="created">Awaiting payment</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select name="delivery" defaultValue={sp.delivery ?? ""} className="input h-9 !w-auto !py-1" aria-label="Delivery status">
          <option value="">Any delivery</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </FilterForm>
      {rows.length === 0 ? (
        <EmptyState title="No orders yet." description="Digital product orders appear here as soon as a customer starts checkout." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Product</Th>
              <Th>Customer</Th>
              <Th className="text-right">Amount</Th>
              <Th>Payment</Th>
              <Th>Delivery</Th>
              <Th>Date</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-canvas/60">
                <Td>
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-[12.5px] font-medium text-ink hover:underline">
                    {o.id.slice(0, 8).toUpperCase()}
                  </Link>
                </Td>
                <Td className="max-w-[12rem] truncate">{o.productName}</Td>
                <Td className="max-w-[14rem] truncate">{o.customerEmail}</Td>
                <Td className="text-right tabular-nums">{formatMoney(o.amountMinor, o.currency)}</Td>
                <Td><StatusPill status={o.paymentStatus} label={o.paymentStatus === "created" ? "awaiting" : o.paymentStatus} /></Td>
                <Td>{o.paymentStatus === "paid" ? <StatusPill status={o.deliveryStatus} /> : <span className="text-faint">—</span>}</Td>
                <Td className="whitespace-nowrap text-xs">{dt(o.createdAt)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/orders/${o.id}`} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">View</Link>
                  {o.paymentStatus === "paid" && user.role === "admin" ? <ResendForm orderId={o.id} email={o.customerEmail} compact /> : null}
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
