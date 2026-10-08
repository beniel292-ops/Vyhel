"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="container-page flex min-h-[60vh] flex-col justify-center py-20">
      <p className="eyebrow">{offline ? "You're offline" : "Something went wrong"}</p>
      <h1 className="display mt-4 max-w-2xl text-[2.75rem] text-ink md:text-[3.75rem]">
        {offline ? "Check your connection." : "We couldn't load this page."}
      </h1>
      <p className="mt-4 max-w-md text-muted">
        {offline
          ? "It looks like you've lost your internet connection. Reconnect and try again."
          : "This is on us, not you. Please try again in a moment."}
      </p>
      {error.digest ? <p className="mt-2 text-xs text-faint">Reference: {error.digest}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClasses("secondary", "lg")}>Go home</Link>
      </div>
    </div>
  );
}
