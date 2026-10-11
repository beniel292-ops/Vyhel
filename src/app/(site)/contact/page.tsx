import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getSettings();
  const details = [
    s.legalName ? ["Business", s.legalName] : null,
    s.supportPhone ? ["Phone", s.supportPhone] : null,
    s.businessAddress ? ["Address", s.businessAddress] : null,
  ].filter(Boolean) as [string, string][];
  return (
    <LegalPage eyebrow="Contact" title="Get in touch.">
      <p>
        {s.reviewMode
          ? <>Questions about a {s.siteName} digital product, your order or a download? We read every message.</>
          : <>Spotted something that&rsquo;s out of date, have a product you think we should look at, or need help with something you bought from our Shop? We read every message.</>}
      </p>
      {s.contactEmail ? (
        <p>
          Email: <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
        </p>
      ) : (
        <p>Our contact address is being set up. Please check back soon.</p>
      )}
      {details.length ? (
        <ul>
          {details.map(([k, v]) => (
            <li key={k}>
              <strong>{k}:</strong> {v}
            </li>
          ))}
        </ul>
      ) : null}
      <h2>Orders and downloads</h2>
      <p>
        {s.siteName} sells digital products directly. For help with an order, a missing download or a refund, email us with
        your order number and the email address you used at checkout. See our{" "}
        <Link href="/delivery-policy">delivery policy</Link> and <Link href="/refund-policy">refund &amp; cancellation policy</Link>.
      </p>
      {s.reviewMode ? null : (
        <p>
          Products you buy from Amazon or other retailers through our recommendations are sold by that retailer — contact
          them for orders, delivery, returns or refunds.
        </p>
      )}
    </LegalPage>
  );
}
