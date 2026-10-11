import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/settings";
import { listPublicDigitalProducts } from "@/server/services/digital-products";

export const revalidate = 3600;
export const metadata: Metadata = { title: "About", description: "Why Vyhel exists and how we choose what to feature.", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const s = await getSettings();
  // Razorpay review mode (docs/razorpay-review-mode.md): describe only the digital-products business.
  if (s.reviewMode) {
    const products = await listPublicDigitalProducts();
    return (
      <LegalPage eyebrow="About" title="Practical guides, sold directly.">
        <p>
          {s.siteName} writes and sells downloadable guides for Indian students and beginner developers — practical,
          step-by-step help for specific problems{s.legalName ? <>. {s.siteName} is run by {s.legalName}</> : null}.
        </p>
        {products.length ? (
          <>
            <h2>What we sell</h2>
            <ul>
              {products.map((p) => (
                <li key={p.id}>
                  <Link href={`/shop/${p.slug}`}>{p.name}</Link>
                  {p.shortDescription ? <> — {p.shortDescription}</> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h2>How it works</h2>
        <ul>
          <li>Every product is a digital download, priced in rupees on its product page.</li>
          <li>You pay on Razorpay&rsquo;s secure checkout. We never see your card, UPI or bank details.</li>
          <li>Your private download link appears on the confirmation page and is emailed to you straight away.</li>
        </ul>
        <p>
          Read our <Link href="/delivery-policy">delivery policy</Link> and{" "}
          <Link href="/refund-policy">refund &amp; cancellation policy</Link>, or <Link href="/contact">contact us</Link>.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage eyebrow="About" title="Fewer, better decisions.">
      <p>
        Online shopping has no shortage of products. What&rsquo;s missing is context: what a product is actually good
        for, who it suits, what its limitations are, and whether it&rsquo;s worth considering at all.
      </p>
      <p>
        Vyhel researches, organises and explains products so you can make that call yourself. We start with real
        problems — a hot laptop, a cluttered desk, a car that needs a clean — and point to products that solve them.
      </p>
      <h2>How we choose</h2>
      <ul>
        <li>We look for products that solve a clear, common problem.</li>
        <li>We describe limitations as plainly as strengths. Every product page has a &ldquo;Things to know&rdquo; and a &ldquo;Who should skip it&rdquo; section.</li>
        <li>We say when something is our editorial judgement. We only say we tested a product when we actually did.</li>
        <li>We don&rsquo;t publish prices, ratings or availability we can&rsquo;t keep accurate. Those live on the merchant&rsquo;s site.</li>
      </ul>
      <h2>The Vyhel score</h2>
      <p>
        Each score is an editorial assessment across usefulness, ease of use, versatility, value and design. It is not an
        Amazon rating, and it isn&rsquo;t based on customer reviews.
      </p>
      <h2>How Vyhel is funded</h2>
      <p>
        Two ways. When you buy a recommended product through our links (for example on Amazon), the retailer sells it and we
        may earn a commission at no extra cost to you. Separately, our Shop sells a small number of digital products that we
        make ourselves — those you buy directly from Vyhel.
        That never changes what we write. Read our <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
      </p>
    </LegalPage>
  );
}
