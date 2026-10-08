"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value.startsWith("/") ? `${window.location.origin}${value}` : value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded px-2 py-1 text-[12px] text-ink-soft hover:bg-sunken"
    >
      {done ? "Copied" : "Copy URL"}
    </button>
  );
}
