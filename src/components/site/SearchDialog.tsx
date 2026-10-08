"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, SearchIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "vyhel:open-search";
export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

type Result = { type: string; title: string; subtitle?: string | null; href: string };

type ApiResponse = {
  products: { slug: string; name: string; categoryName: string | null }[];
  guides: { slug: string; title: string; categoryName: string | null }[];
  collections: { slug: string; name: string; tagline: string | null }[];
  categories: { slug: string; name: string; description: string }[];
};

const SUGGESTIONS: Result[] = [
  { type: "Browse", title: "All products", href: "/products" },
  { type: "Browse", title: "Buying guides", href: "/guides" },
  { type: "Browse", title: "Collections", href: "/collections" },
  { type: "Browse", title: "Categories", href: "/categories" },
];

function flatten(data: ApiResponse): Result[] {
  return [
    ...data.products.map((p) => ({ type: "Products", title: p.name, subtitle: p.categoryName, href: `/products/${p.slug}` })),
    ...data.guides.map((g) => ({ type: "Guides", title: g.title, subtitle: g.categoryName, href: `/guides/${g.slug}` })),
    ...data.collections.map((c) => ({ type: "Collections", title: c.name, subtitle: c.tagline, href: `/collections/${c.slug}` })),
    ...data.categories.map((c) => ({ type: "Categories", title: c.name, subtitle: c.description, href: `/categories/${c.slug}` })),
  ];
}

export function SearchDialog() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{ q: string; results: Result[] }>({ q: "", results: [] });
  const [active, setActive] = useState(0);
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;
  const results = searching ? response.results : [];
  const loading = searching && response.q !== trimmed;

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (d && !d.open) {
      d.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as ApiResponse;
        setResponse({ q, results: flatten(data) });
        setActive(0);
      } catch {
        /* aborted or offline */
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const list = searching ? results : SUGGESTIONS;

  const go = (href: string) => {
    if (query.trim().length >= 2) trackEvent("search", { meta: { q: query.trim().slice(0, 80), results: results.length } });
    close();
    setQuery("");
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = list[active];
      if (target) go(target.href);
      else if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search Vyhel"
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="m-0 mx-auto mt-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0 backdrop:bg-ink/30 backdrop:backdrop-blur-[2px] md:mt-[12vh] md:h-auto md:max-h-[70vh] md:max-w-xl md:rounded-xl md:border md:border-line md:shadow-2xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon size={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search products, guides, collections…"
            aria-label="Search"
            aria-controls="search-results"
            aria-activedescendant={list[active] ? `sr-${active}` : undefined}
            className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
          />
          <button type="button" onClick={close} className="rounded px-2 py-1 text-xs text-muted hover:bg-sunken">
            Esc
          </button>
        </div>
        <ul id="search-results" role="listbox" className="flex-1 overflow-y-auto p-2 md:max-h-[52vh]">
          {loading && list.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">Searching…</li> : null}
          {!loading && query.trim().length >= 2 && results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted">
              Nothing matches &ldquo;{query.trim()}&rdquo; yet.
            </li>
          ) : null}
          {list.map((r, i) => {
            const header = i === 0 || list[i - 1].type !== r.type ? r.type : null;
            return (
              <li key={`${r.href}-${i}`} role="presentation">
                {header ? <p className="eyebrow px-3 pb-1.5 pt-3">{header}</p> : null}
                <button
                  id={`sr-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left",
                    i === active ? "bg-surface ring-1 ring-line" : "",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{r.title}</span>
                    {r.subtitle ? <span className="block truncate text-xs text-muted">{r.subtitle}</span> : null}
                  </span>
                  <ArrowRight size={14} className={cn("text-muted", i === active ? "opacity-100" : "opacity-0")} />
                </button>
              </li>
            );
          })}
        </ul>
        {query.trim().length >= 2 ? (
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="w-full rounded-md px-3 py-2 text-left text-[13px] text-muted hover:bg-sunken hover:text-ink"
            >
              See all results for &ldquo;{query.trim()}&rdquo;
            </button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
