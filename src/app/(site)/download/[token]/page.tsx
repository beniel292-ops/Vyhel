import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { checkDownloadToken } from "@/server/services/digital-orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your download", robots: { index: false, follow: false }, referrer: "no-referrer" };

const MESSAGES: Record<string, { title: string; body: string }> = {
  invalid: { title: "This download link isn't valid.", body: "Check that you copied the whole link from your email." },
  expired: { title: "This download link has expired.", body: "For your security, links expire after a few days. Contact us and we'll send a fresh one." },
  exhausted: { title: "This link has reached its download limit.", body: "Contact us with your order number and we'll send a new link." },
  revoked: { title: "This link has been replaced.", body: "A newer download link was sent to your email. Please use that one." },
  unpaid: { title: "This order isn't paid.", body: "Downloads become available as soon as the payment is confirmed." },
  unavailable: { title: "This file is temporarily unavailable.", body: "We've been notified. Please try again later or contact us." },
};

/**
 * Landing page for the emailed link. Viewing it does NOT count as a download (so email link
 * scanners can't use up the limit); the button does.
 */
export default async function DownloadPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ token }, { error }, settings] = await Promise.all([params, searchParams, getSettings()]);
  const check = await checkDownloadToken(token, { consume: false });
  const support = settings.contactEmail;
  if (!check.ok || (error && MESSAGES[error])) {
    const m = MESSAGES[!check.ok ? check.reason : error!] ?? MESSAGES.invalid;
    return (
      <div className="container-page max-w-xl py-16 md:py-24">
        <p className="eyebrow !text-danger">Download</p>
        <h1 className="display mt-3 text-4xl text-ink">{m.title}</h1>
        <p className="mt-3 text-muted">{m.body}</p>
        {support ? (
          <a href={`mailto:${support}?subject=${encodeURIComponent("Download link help")}`} className={buttonClasses("secondary", "md", "mt-6")}>
            Contact {support}
          </a>
        ) : (
          <Link href="/contact" className={buttonClasses("secondary", "md", "mt-6")}>Contact us</Link>
        )}
      </div>
    );
  }
  return (
    <div className="container-page max-w-xl py-16 md:py-24">
      <p className="eyebrow !text-accent">Your download</p>
      <h1 className="display mt-3 text-[2.75rem] leading-tight text-ink">{check.order.productName}</h1>
      <p className="mt-3 text-muted">Thanks for your purchase. Your file is ready.</p>
      <a href={`/api/downloads/${token}`} className={buttonClasses("primary", "lg", "mt-8")}>
        Download file
      </a>
      <p className="mt-4 text-xs text-muted">
        {check.remaining} {check.remaining === 1 ? "download" : "downloads"} left · link valid until {formatDate(check.expiresAt, { month: "long" })}. Please don&rsquo;t share this link.
      </p>
    </div>
  );
}
