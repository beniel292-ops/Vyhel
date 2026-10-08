import type { Metadata } from "next";
import { CheckoutStatus } from "./CheckoutStatus";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <div className="container-page max-w-xl py-16 md:py-24">
      <CheckoutStatus orderId={order ?? ""} />
    </div>
  );
}
