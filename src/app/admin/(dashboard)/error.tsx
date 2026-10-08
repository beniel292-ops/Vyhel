"use client";

import { Button } from "@/components/ui/Button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <h1 className="text-lg font-semibold text-ink">This page couldn&rsquo;t load.</h1>
      <p className="mt-2 text-sm text-muted">Usually a temporary database or network problem. Your saved work is safe.</p>
      {error.digest ? <p className="mt-2 text-xs text-faint">Reference: {error.digest}</p> : null}
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </div>
  );
}
