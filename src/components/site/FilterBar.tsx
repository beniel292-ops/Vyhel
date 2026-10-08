"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * URL-driven filters: shareable, back-button friendly, and the page is server-rendered from the URL.
 * Works as a plain GET form without JavaScript.
 */
export function FilterBar({
  categories,
  bestFor,
  total,
}: {
  categories: Option[];
  bestFor: Option[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["category", "bestFor", "minScore"].filter((k) => params.get(k)).length;

  const select = (name: string, label: string, options: Option[], allLabel: string) => (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <select
        name={name}
        value={params.get(name) ?? ""}
        onChange={(e) => update(name, e.target.value)}
        className="input h-10 !py-0"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form
      action={pathname}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        update("q", q.trim());
      }}
      className={cn("transition-opacity", pending && "opacity-70")}
      role="search"
      aria-label="Filter products"
    >
      <div className="relative">
        <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="h-12 w-full rounded-md border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
        />
      </div>

      <details className="group mt-4 md:hidden">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-md border border-line bg-surface px-4 text-sm text-ink">
          <span>Filters & sorting{active ? ` · ${active} active` : ""}</span>
          <span className="text-muted transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {select("category", "Category", categories, "All")}
          {select("bestFor", "Best for", bestFor, "Anyone")}
          {select("minScore", "Vyhel score", SCORE_OPTIONS, "Any")}
          {select("sort", "Sort", SORT_OPTIONS.slice(1), "Featured")}
        </div>
      </details>

      <div className="mt-4 hidden grid-cols-4 gap-4 md:grid">
        {select("category", "Category", categories, "All categories")}
        {select("bestFor", "Best for", bestFor, "Anyone")}
        {select("minScore", "Vyhel score", SCORE_OPTIONS, "Any score")}
        {select("sort", "Sort by", SORT_OPTIONS.slice(1), "Featured")}
      </div>

      <div className="mt-5 flex items-center justify-between text-[13px] text-muted">
        <p aria-live="polite">
          {total} {total === 1 ? "product" : "products"}
        </p>
        {active || params.get("q") ? (
          <button
            type="button"
            className="underline underline-offset-4 hover:text-ink"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>
      <noscript>
        <button type="submit" className="mt-3 rounded border px-3 py-1 text-sm">
          Apply
        </button>
      </noscript>
    </form>
  );
}

const SCORE_OPTIONS = [
  { value: "9", label: "9+ / 10" },
  { value: "8", label: "8+ / 10" },
  { value: "7", label: "7+ / 10" },
];

const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "score", label: "Highest Vyhel score" },
  { value: "newest", label: "Newest" },
];
