import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";
import Link from "next/link";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="2026-10-11">
      <p>By using {s.siteName}, you agree to these terms.</p>
      <h2>Information, not advice</h2>
      <p>
        {s.reviewMode
          ? <>Our guides are general information based on our own experience. They aren&rsquo;t professional, legal or academic advice, and results depend on how you use them.</>
          : <>Our content is general information to help you decide what to consider buying. It isn&rsquo;t professional advice. Always check a product&rsquo;s current listing, specifications and suitability for your needs before buying.</>}
      </p>
      <h2>{s.reviewMode ? "Digital products" : "Two kinds of products"}</h2>
      <p>
        <strong>Digital products in our Shop</strong> are sold directly by {s.siteName}. You pay us through Razorpay and receive a
        personal, non-transferable licence to download and use the files for your own purposes. Please don&rsquo;t resell or
        redistribute them. Refunds are covered by our <Link href="/refund-policy">refund &amp; cancellation policy</Link>.
      </p>
      <h2>Prices and payment</h2>
      <p>
        Prices are shown in Indian rupees (INR) on each product page and are charged exactly as shown at checkout. Payments are
        processed by Razorpay; {s.siteName} never sees or stores your card, UPI or bank details.
      </p>
      <h2>Delivery</h2>
      <p>
        Products are delivered digitally — a download link on the confirmation page and by email. Nothing is shipped. See our{" "}
        <Link href="/delivery-policy">delivery policy</Link>.
      </p>
      {s.reviewMode ? null : (
        <>
          <h2>Recommended products: we are not the seller</h2>
          <p>
            {s.siteName} doesn&rsquo;t sell the products we recommend. Those purchases are made with third-party merchants such as Amazon, under their
            terms. Prices, availability, delivery, warranties and returns are the merchant&rsquo;s responsibility.
          </p>
        </>
      )}
      <h2>Accuracy</h2>
      <p>
        We work to keep content accurate and up to date, but products change. If you spot an error, please let us know.
      </p>
      <h2>Content</h2>
      <p>
        Text{s.reviewMode ? "" : ", scores"}, guides and design on {s.siteName} are ours unless stated otherwise. Product names and trademarks belong to
        their respective owners.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these terms? {s.contactEmail ? <>Email <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>.</> : <>See our <Link href="/contact">contact page</Link>.</>}
      </p>
      <h2>Changes</h2>
      <p>We may update these terms from time to time. The date above shows the latest revision.</p>
    </LegalPage>
  );
}
