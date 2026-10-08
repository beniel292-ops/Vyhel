import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="2026-10-04">
      <p>By using {s.siteName}, you agree to these terms.</p>
      <h2>Information, not advice</h2>
      <p>
        Our content is general information to help you decide what to consider buying. It isn&rsquo;t professional advice.
        Always check a product&rsquo;s current listing, specifications and suitability for your needs before buying.
      </p>
      <h2>Two kinds of products</h2>
      <p>
        <strong>Digital products in our Shop</strong> are sold directly by {s.siteName}. You pay us through Razorpay and receive a
        personal, non-transferable licence to download and use the files for your own purposes. Please don&rsquo;t resell or
        redistribute them. Refunds are covered by our refund policy.
      </p>
      <h2>Recommended products: we are not the seller</h2>
      <p>
        {s.siteName} doesn&rsquo;t sell the products we recommend. Those purchases are made with third-party merchants such as Amazon, under their
        terms. Prices, availability, delivery, warranties and returns are the merchant&rsquo;s responsibility.
      </p>
      <h2>Accuracy</h2>
      <p>
        We work to keep content accurate and up to date, but products change. If you spot an error, please let us know.
      </p>
      <h2>Content</h2>
      <p>
        Text, scores and design on {s.siteName} are ours unless stated otherwise. Product names and trademarks belong to
        their respective owners.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. The date above shows the latest revision.</p>
    </LegalPage>
  );
}
