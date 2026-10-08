import { AdminPageHeader } from "@/components/admin/kit";
import { getRazorpayConfig } from "@/lib/payments/razorpay";
import { storageDriver } from "@/lib/storage/private-files";
import { getPickerOptions } from "@/server/queries/admin";
import { DigitalProductForm } from "../DigitalProductForm";

export const metadata = { title: "New digital product" };

export default async function NewDigitalProduct() {
  const opts = await getPickerOptions();
  return (
    <>
      <AdminPageHeader title="New digital product" back={{ href: "/admin/digital-products", label: "Digital products" }} />
      <DigitalProductForm file={null} media={opts.media} driver={storageDriver()} paymentsReady={Boolean(getRazorpayConfig())} />
    </>
  );
}
