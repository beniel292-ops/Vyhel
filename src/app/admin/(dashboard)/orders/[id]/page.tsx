import { notFound } from "next/navigation";
import { AdminPageHeader, Panel, StatusPill, Table, Td, Th } from "@/components/admin/kit";
import { requireUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/http";
import { formatMoney } from "@/lib/money";
import { adminGetOrder } from "@/server/services/digital-orders";
import { ResendForm } from "../ResendForm";

export const metadata = { title: "Order" };

const dt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d) : "—");

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [user, data] = await Promise.all([requireUser(), adminGetOrder(id)]);
  if (!data) notFound();
  const { order: o, tokens, attempts } = data;
  const rows: [string, React.ReactNode][] = [
    ["Order ID", <span key="i" className="font-mono text-xs">{o.id}</span>],
    ["Product", o.productName],
    ["Customer", <>{o.customerEmail}{o.customerName ? ` · ${o.customerName}` : ""}</>],
    ["Amount", formatMoney(o.amountMinor, o.currency)],
    ["Payment", <StatusPill key="p" status={o.paymentStatus} />],
    ["Confirmed by", o.paymentSource ?? "—"],
    ["Razorpay order", <span key="ro" className="font-mono text-xs">{o.razorpayOrderId}</span>],
    ["Razorpay payment", <span key="rp" className="font-mono text-xs">{o.razorpayPaymentId ?? "—"}</span>],
    ["Paid at", dt(o.paidAt)],
    ["Created", dt(o.createdAt)],
    ["Delivery", <span key="d" className="flex items-center gap-2"><StatusPill status={o.deliveryStatus} /> {o.deliveryAttempts} attempt{o.deliveryAttempts === 1 ? "" : "s"}</span>],
    ["Last delivery", dt(o.lastDeliveryAt)],
  ];
  if (o.lastDeliveryError) rows.push(["Last error", <span key="e" className="text-danger">{o.lastDeliveryError}</span>]);
  if (o.failureReason) rows.push(["Failure reason", o.failureReason]);
  return (
    <>
      <AdminPageHeader title={`Order ${o.id.slice(0, 8).toUpperCase()}`} back={{ href: "/admin/orders", label: "Digital orders" }} description={`${o.productName} · ${o.customerEmail}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Details">
          <dl className="divide-y divide-line-soft text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 py-2">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <div className="space-y-6">
          <Panel title="Delivery">
            {o.paymentStatus !== "paid" ? (
              <p className="text-sm text-muted">Delivery becomes available once the payment is confirmed.</p>
            ) : user.role === "admin" ? (
              <ResendForm orderId={o.id} email={o.customerEmail} />
            ) : (
              <p className="text-sm text-muted">Only admins can resend download emails.</p>
            )}
          </Panel>
        </div>
      </div>
      <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Customer email attempts</h2>
      {attempts === null ? (
        <p className="text-sm text-muted">Attempt history isn&rsquo;t available yet (run the latest database migration).</p>
      ) : attempts.length === 0 ? (
        <p className="text-sm text-muted">No customer email attempts recorded.</p>
      ) : (
        <Table>
          <thead>
            <tr><Th>When</Th><Th>#</Th><Th>Via</Th><Th>Status</Th><Th>Resend message ID</Th><Th>Error</Th></tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id}>
                <Td className="text-xs">{dt(a.createdAt)}</Td>
                <Td className="tabular-nums">{a.attempt}</Td>
                <Td className="text-xs">{a.trigger}</Td>
                <Td><StatusPill status={a.status === "delivered" || a.status === "accepted" ? "active" : a.status === "delayed" ? "pending" : "archived"} label={a.status} /></Td>
                <Td className="font-mono text-xs">{a.providerMessageId ?? "—"}</Td>
                <Td className="max-w-md text-xs text-muted">{a.error ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Only the customer&rsquo;s download email is listed here. The admin sale notification is a separate email to ADMIN_EMAIL.</p>
      <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Download links</h2>
      {tokens.length === 0 ? (
        <p className="text-sm text-muted">No links issued yet.</p>
      ) : (
        <Table>
          <thead>
            <tr><Th>Issued</Th><Th>Via</Th><Th>Downloads</Th><Th>Expires</Th><Th>Last used</Th><Th>State</Th></tr>
          </thead>
          <tbody>
            {tokens.map((t) => {
              const state = t.revokedAt ? "revoked" : t.expiresAt < new Date() ? "expired" : t.downloadCount >= t.maxDownloads ? "used up" : "active";
              return (
                <tr key={t.id}>
                  <Td className="text-xs">{dt(t.createdAt)}</Td>
                  <Td className="text-xs">{t.reason}</Td>
                  <Td className="tabular-nums">{t.downloadCount} / {t.maxDownloads}</Td>
                  <Td className="text-xs">{dt(t.expiresAt)}</Td>
                  <Td className="text-xs">{dt(t.lastUsedAt)}</Td>
                  <Td><StatusPill status={state === "active" ? "active" : state === "revoked" ? "archived" : "pending"} label={state} /></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">Links are stored only as hashes — nobody, including admins, can read an existing link. Resending issues a fresh one.</p>
    </>
  );
}
