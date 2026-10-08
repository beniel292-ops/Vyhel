import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader, StatusPill } from "@/components/admin/kit";
import { isUuid } from "@/lib/http";
import { getRazorpayConfig } from "@/lib/payments/razorpay";
import { storageDriver } from "@/lib/storage/private-files";
import { getPickerOptions } from "@/server/queries/admin";
import { adminGetDigitalProduct } from "@/server/services/digital-products";
import { DigitalProductForm } from "../DigitalProductForm";

export const metadata = { title: "Edit digital product" };

export default async function EditDigitalProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [row, opts] = await Promise.all([adminGetDigitalProduct(id), getPickerOptions()]);
  if (!row) notFound();
  const p = row.product;
  return (
    <>
      <AdminPageHeader
        title={p.name}
        back={{ href: "/admin/digital-products", label: "Digital products" }}
        description={
          <span className="flex items-center gap-2">
            <StatusPill status={p.status} />
            {p.status === "active" ? <Link href={`/shop/${p.slug}`} target="_blank" className="underline underline-offset-2">View in shop ↗</Link> : null}
            <Link href={`/admin/orders?q=${encodeURIComponent(p.name)}`} className="underline underline-offset-2">Orders</Link>
          </span>
        }
      />
      <DigitalProductForm
        key={p.updatedAt.toISOString()}
        product={p}
        file={row.file ? { id: row.file.id, filename: row.file.filename, sizeBytes: row.file.sizeBytes } : null}
        media={opts.media}
        driver={storageDriver()}
        paymentsReady={Boolean(getRazorpayConfig())}
      />
    </>
  );
}
