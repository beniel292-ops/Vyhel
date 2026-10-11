import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Refund & Cancellation Policy", alternates: { canonical: "/refund-policy" } };

export default async function RefundPolicyPage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Legal" title="Refund & cancellation policy" updated="2026-10-11">
      <p>
        This policy covers digital products sold directly by {s.siteName} on our Shop.
        {s.reviewMode ? null : (
          <> It does not apply to products you buy from Amazon or other retailers through our recommendations — those purchases are governed by the retailer&rsquo;s own policies.</>
        )}
      </p>
      <h2>Digital products</h2>
      <p>Because digital products are delivered instantly and can&rsquo;t be returned, all sales are generally final once the download link has been delivered.</p>
      <p>We will refund your payment in full if:</p>
      <ul>
        <li>You were charged but did not receive your download and we can&rsquo;t resolve it within 72 hours.</li>
        <li>You were charged more than once for the same order.</li>
        <li>The file is corrupted or materially different from its description and we can&rsquo;t fix it.</li>
      </ul>
      <h2>How to request a refund</h2>
      <p>Email us{s.contactEmail ? <> at <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></> : null} within 7 days of purchase with your order number and the email address used at checkout. Approved refunds are issued to the original payment method through Razorpay, usually within 5–7 working days.</p>
      <h2>Cancellations</h2>
      <p>Orders are fulfilled immediately after payment, so they can&rsquo;t be cancelled once paid. If a payment fails or you close the payment window, no order is placed and you are not charged.</p>
    </LegalPage>
  );
}
