import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Contact" title="Get in touch.">
      <p>
        Spotted something that&rsquo;s out of date, have a product you think we should look at, or want to work with us?
        We read every message.
      </p>
      {s.contactEmail ? (
        <p>
          Email: <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
        </p>
      ) : (
        <p>Our contact address is being set up. Please check back soon.</p>
      )}
      <p>
        Please note that Vyhel doesn&rsquo;t sell products. For orders, delivery, returns or refunds, contact the
        merchant you bought from.
      </p>
    </LegalPage>
  );
}
