import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Shipping & Delivery Policy", alternates: { canonical: "/delivery-policy" } };

export default async function DeliveryPolicyPage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Legal" title="Shipping & delivery policy" updated="2026-10-11">
      <p>{s.siteName} sells digital products only. Nothing is shipped physically.</p>
      <h2>How delivery works</h2>
      <ul>
        <li>After your payment is confirmed, we email a private download link to the address you entered at checkout — usually within a minute.</li>
        <li>The confirmation page also shows a download button straight away.</li>
        <li>Each emailed link works for up to 10 downloads within 7 days. If yours expires, email us and we&rsquo;ll send a new one.</li>
      </ul>
      <h2>Didn&rsquo;t receive it?</h2>
      <p>Check your spam or promotions folder first. Still missing? Email us{s.contactEmail ? <> at <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></> : null} with your order number and we&rsquo;ll resend it — to a corrected address if needed.</p>
      {s.reviewMode ? null : (
        <>
          <h2>Products from other retailers</h2>
          <p>Products we recommend with a &ldquo;Buy on Amazon&rdquo; (or other retailer) button are sold and shipped by that retailer, not by {s.siteName}.</p>
        </>
      )}
    </LegalPage>
  );
}
