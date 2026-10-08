import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Affiliate Disclosure", alternates: { canonical: "/affiliate-disclosure" } };

export default async function AffiliateDisclosurePage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Legal" title="Affiliate disclosure" updated="2026-10-04">
      <blockquote>{s.affiliateDisclosure}</blockquote>
      <p>
        {s.siteName} is a participant in the Amazon Associates Programme, an affiliate advertising programme designed to
        provide a means for sites to earn advertising fees by advertising and linking to Amazon.
      </p>
      <h2>What this means</h2>
      <ul>
        <li>Buttons and links marked &ldquo;Paid link&rdquo; take you to Amazon. If you buy something after clicking, we may earn a commission.</li>
        <li>You pay the same price whether or not you use our link.</li>
        <li>For these recommended products, {s.siteName} is not the seller. Prices, availability, delivery and returns are handled by Amazon and its sellers. (Digital products in our <Link href="/shop">Shop</Link> are different — those we sell directly.)</li>
        <li>We don&rsquo;t display prices on {s.siteName}, because they change frequently. Always check the current listing.</li>
      </ul>
      <h2>Editorial independence</h2>
      <p>
        Commissions never decide what we feature or what we say about it. We include limitations, &ldquo;who should
        skip it&rdquo; advice and alternatives on every product page. Vyhel scores are our own editorial assessments and
        are not Amazon ratings.
      </p>
      <p>If we ever publish sponsored content, it will be labelled clearly as sponsored.</p>
    </LegalPage>
  );
}
