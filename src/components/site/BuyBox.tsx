"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * DIGITAL PRODUCT checkout (Razorpay). Only ever rendered on /shop pages.
 * The browser sends the product slug + email; the server decides the price and creates the order.
 */
type CheckoutResponse = {
  orderId: string;
  razorpay: {
    key: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image: string;
    prefill: { email: string; name: string };
  };
};

type RazorpayHandlerResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: { error?: { description?: string } }) => void): void };
  }
}

function loadCheckoutScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function BuyBox({ slug, priceLabel, productName }: { slug: string; priceLabel: string; productName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<"idle" | "starting" | "paying" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const busy = state !== "idle";

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setFieldError("Enter a valid email — your download is sent there.");
      return;
    }
    if (!agree) {
      setError("Please confirm you understand this is a digital download.");
      return;
    }
    setState("starting");
    const [scriptOk, res] = await Promise.all([
      loadCheckoutScript(),
      fetch("/api/digital-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productSlug: slug, email: email.trim(), name: name.trim() }),
      }).catch(() => null),
    ]);
    if (!res) {
      setState("idle");
      setError("You seem to be offline. Check your connection and try again.");
      return;
    }
    const data = (await res.json().catch(() => ({}))) as Partial<CheckoutResponse> & { error?: string; field?: string };
    if (!res.ok || !data.razorpay) {
      setState("idle");
      if (data.field === "email") setFieldError(data.error ?? "Check your email address.");
      else setError(data.error ?? "We couldn't start checkout. Please try again.");
      return;
    }
    if (!scriptOk || !window.Razorpay) {
      setState("idle");
      setError("The payment window couldn't load. Disable ad-blockers for this page and try again.");
      return;
    }
    const orderId = data.orderId!;
    setState("paying");
    // Razorpay keeps its window open after a failed attempt (so the buyer can retry); if they then
    // close it, keep showing why it failed instead of a generic "cancelled".
    let failure: string | null = null;
    const rzp = new window.Razorpay({
      key: data.razorpay.key,
      order_id: data.razorpay.orderId,
      amount: data.razorpay.amount,
      currency: data.razorpay.currency,
      name: data.razorpay.name,
      description: data.razorpay.description,
      image: data.razorpay.image,
      prefill: data.razorpay.prefill,
      notes: { vyhel_order: orderId },
      theme: { color: "#171717" },
      modal: {
        ondismiss: () => {
          setState("idle");
          setError(failure ? `${failure} If any money was debited, it is refunded automatically.` : "Payment cancelled. You haven't been charged.");
        },
      },
      handler: async (r: RazorpayHandlerResponse) => {
        setState("verifying");
        const v = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(r),
        }).catch(() => null);
        const out = (await v?.json().catch(() => ({}))) as { ok?: boolean; downloadToken?: string | null; error?: string };
        // Even if verification here fails (network), the webhook confirms the order; the success page polls.
        const hashPart = out?.ok && out.downloadToken ? `#t=${out.downloadToken}` : "";
        if (v && !v.ok && v.status === 400) {
          setState("idle");
          setError(out?.error ?? "We couldn't verify the payment.");
          return;
        }
        router.push(`/checkout/success?order=${orderId}${hashPart}`);
      },
    });
    rzp.on("payment.failed", (resp) => {
      failure = resp.error?.description ? `Payment failed: ${resp.error.description}` : "Payment failed.";
      setError(`${failure} You can try again in the payment window.`);
    });
    rzp.open();
  }

  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)} className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
          Buy Now · {priceLabel}
        </button>
        <p className="mt-3 text-[13px] text-muted">Sold by Vyhel · Instant delivery to your email · Secure payment via Razorpay</p>
      </div>
    );
  }

  return (
    <form onSubmit={start} className="rounded-[var(--radius-card)] border border-line bg-surface p-5" noValidate aria-label={`Buy ${productName}`}>
      <p className="text-sm font-medium text-ink">Where should we send your download?</p>
      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="field-label">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldError) || undefined}
            className={cn("input !py-2.5", fieldError && "!border-danger")}
            placeholder="you@example.com"
            disabled={busy}
            autoFocus
          />
          {fieldError ? <span className="mt-1 block text-xs text-danger">{fieldError}</span> : <span className="field-hint">Your receipt and private download link go here.</span>}
        </label>
        <label className="block">
          <span className="field-label">Name <span className="font-normal text-muted">(optional)</span></span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="input !py-2.5" disabled={busy} />
        </label>
        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-accent)]" disabled={busy} />
          <span>
            I understand this is a digital product delivered by email, and I agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2">terms</Link> and{" "}
            <Link href="/refund-policy" className="underline underline-offset-2">refund policy</Link>.
          </span>
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "mt-5 w-full")}>
        {state === "starting" ? "Starting secure checkout…" : state === "paying" ? "Complete payment in the Razorpay window…" : state === "verifying" ? "Confirming payment…" : `Pay ${priceLabel}`}
      </button>
      <p className="mt-3 text-center text-xs text-muted">Payments are processed by Razorpay. Vyhel never sees your card or UPI details.</p>
    </form>
  );
}
