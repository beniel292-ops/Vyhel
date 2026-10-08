"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/Button";

type Status = {
  id: string;
  productName: string;
  email: string;
  amountMinor: number;
  currency: string;
  paymentStatus: "created" | "paid" | "failed" | "refunded";
  deliveryStatus: "pending" | "sent" | "failed";
};

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/** Polls the minimal public order status until the payment is confirmed (by verify or webhook). */
export function CheckoutStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [missing, setMissing] = useState(false);
  const [tries, setTries] = useState(0);
  // The download token travels in the URL fragment (#t=…), which browsers never send to servers.
  const token = useSyncExternalStore(
    subscribeHash,
    () => new URLSearchParams(window.location.hash.slice(1)).get("t"),
    () => null,
  );

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return;
    let stop = false;
    async function tick() {
      const r = await fetch(`/api/digital-orders/${orderId}/status`, { cache: "no-store" }).catch(() => null);
      if (stop) return;
      if (r?.status === 404) {
        setMissing(true);
        return;
      }
      const s = (await r?.json().catch(() => null)) as Status | null;
      if (s) setStatus(s);
      if (!s || s.paymentStatus === "created") setTimeout(() => setTries((t) => t + 1), 2500);
    }
    tick();
    return () => {
      stop = true;
    };
  }, [orderId, tries]);

  if (!/^[0-9a-f-]{36}$/i.test(orderId) || missing) {
    return (
      <div>
        <p className="eyebrow">Order</p>
        <h1 className="display mt-3 text-4xl text-ink">We couldn&rsquo;t find that order.</h1>
        <p className="mt-3 text-muted">If you were charged, check your email for the receipt and download link, or contact us.</p>
        <Link href="/shop" className={buttonClasses("secondary", "md", "mt-6")}>Back to the shop</Link>
      </div>
    );
  }

  if (!status || status.paymentStatus === "created") {
    return (
      <div role="status" aria-live="polite">
        <p className="eyebrow">Confirming payment</p>
        <h1 className="display mt-3 text-4xl text-ink">Just a moment…</h1>
        <p className="mt-3 text-muted">
          We&rsquo;re confirming your payment with Razorpay. This usually takes a few seconds — you can safely keep this page open.
          {tries > 10 ? " Still waiting? If you were charged, your download link will arrive by email as soon as the payment is confirmed." : ""}
        </p>
        <span className="mt-6 inline-block size-5 animate-spin rounded-full border-2 border-line border-t-ink" />
      </div>
    );
  }

  if (status.paymentStatus !== "paid") {
    return (
      <div>
        <p className="eyebrow !text-danger">Payment not completed</p>
        <h1 className="display mt-3 text-4xl text-ink">The payment didn&rsquo;t go through.</h1>
        <p className="mt-3 text-muted">You haven&rsquo;t been charged for this order. You can try again from the product page.</p>
        <Link href="/shop" className={buttonClasses("primary", "md", "mt-6")}>Back to the shop</Link>
      </div>
    );
  }

  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: status.currency }).format(status.amountMinor / 100);
  return (
    <div>
      <p className="eyebrow !text-accent">Payment successful</p>
      <h1 className="display mt-3 text-[2.75rem] leading-tight text-ink">Thank you — it&rsquo;s yours.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        Your purchase of <strong className="text-ink">{status.productName}</strong> ({amount}) is confirmed.{" "}
        {status.deliveryStatus === "sent"
          ? `We've emailed your private download link to ${status.email}.`
          : status.deliveryStatus === "failed"
            ? `We couldn't email ${status.email} just now — we've been notified and will resend it. You can download below.`
            : `Your download link is on its way to ${status.email}.`}
      </p>
      {token ? (
        <a href={`/api/downloads/${token}`} className={buttonClasses("primary", "lg", "mt-8")}>
          Download now
        </a>
      ) : null}
      <dl className="mt-10 grid grid-cols-2 gap-y-2 border-t border-line pt-6 text-sm">
        <dt className="text-muted">Order</dt>
        <dd className="text-right font-mono text-ink">{status.id.slice(0, 8).toUpperCase()}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="text-right text-ink">{status.email}</dd>
      </dl>
      <p className="mt-6 text-xs text-muted">Didn&rsquo;t get the email? Check spam/promotions, or contact us with your order number.</p>
    </div>
  );
}
