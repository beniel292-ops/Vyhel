"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Lightweight toast: renders a message briefly. Pair with useActionState results. */
export function Toast({ message, tone = "success", nonce }: { message?: string | null; tone?: "success" | "error"; nonce?: number }) {
  const [dismissed, setDismissed] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setDismissed(nonce), 3500);
    return () => clearTimeout(t);
  }, [message, nonce]);
  if (!message || dismissed === nonce) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 animate-fade-up rounded-md px-4 py-2.5 text-sm shadow-lg",
        tone === "success" ? "bg-ink text-white" : "bg-danger text-white",
      )}
    >
      {message}
    </div>
  );
}
