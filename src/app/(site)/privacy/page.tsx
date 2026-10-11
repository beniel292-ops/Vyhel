import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy" updated="2026-10-11">
      <p>
        {s.siteName} is built to need as little information about you as possible. You don&rsquo;t need an account to use
        the site.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Aggregate usage.</strong> We record which pages are viewed
          {s.reviewMode ? null : <>, which products&rsquo; merchant links are clicked, where on the page the click happened,</>} and the
          general source of the visit (for example &ldquo;instagram&rdquo; or &ldquo;google&rdquo;).
        </li>
        <li>
          <strong>No IP addresses or device fingerprints.</strong> Our own analytics don&rsquo;t store your IP address,
          browser details or any identifier that could be linked to you.
        </li>
        <li>
          <strong>No tracking cookies from us.</strong> We keep a random, temporary session value in your browser&rsquo;s
          session storage so a single visit is counted once. It&rsquo;s deleted when you close the tab.
        </li>
      </ul>
      <h2>When you buy a digital product</h2>
      <ul>
        <li>We collect your email address (and name, if you give it) to deliver your purchase, send your receipt and provide support.</li>
        <li>Payments are processed by <strong>Razorpay</strong>. We never see or store your card, UPI or bank details — only the payment reference, amount and status.</li>
        <li>Delivery emails are sent through our email provider (Resend).</li>
        <li>We keep order records as required for accounting and tax purposes.</li>
      </ul>
      <h2>Third parties</h2>
      <ul>
        <li>
          <strong>Razorpay.</strong> Your payment is handled on Razorpay&rsquo;s checkout and governed by Razorpay&rsquo;s privacy policy.
        </li>
        {s.reviewMode ? null : (
          <li>
            <strong>Amazon.</strong> When you follow a paid link, Amazon may set cookies to attribute your purchase. Their
            use of data is governed by Amazon&rsquo;s privacy notice.
          </li>
        )}
        {s.googleAnalyticsId ? (
          <li>
            <strong>Google Analytics.</strong> We use Google Analytics with IP anonymisation to understand overall traffic.
          </li>
        ) : null}
        <li>
          <strong>Hosting.</strong> Our hosting provider may keep standard server logs for security and reliability.
        </li>
      </ul>
      <h2>Your choices</h2>
      <p>
        You can block cookies in your browser settings and still use {s.siteName} fully. If you have questions about your
        data, contact us{s.contactEmail ? <> at <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></> : null}.
      </p>
    </LegalPage>
  );
}
