"use client";

import { useState } from "react";
import { ArticleBody } from "@/components/site/ArticleBody";
import { cn } from "@/lib/utils";
import { useFieldError } from "./form";

/** Markdown editor with a live preview using the exact public renderer. */
export function MarkdownEditor({ name, label, defaultValue, rows = 22, hint }: { name: string; label: string; defaultValue?: string; rows?: number; hint?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const error = useFieldError(name);
  const words = value.split(/\s+/).filter(Boolean).length;
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between">
        <span className="field-label !mb-0">{label}</span>
        <div className="flex rounded-md border border-line p-0.5 text-xs" role="tablist">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn("rounded px-2.5 py-1 capitalize", tab === t ? "bg-ink text-white" : "text-muted hover:text-ink")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        className={cn("input font-mono !text-[13px] !leading-relaxed", tab === "preview" && "hidden", error && "!border-danger")}
        placeholder={"## A section heading\n\nWrite in Markdown. Use ## for sections — they become the table of contents."}
      />
      {tab === "preview" ? (
        <div className="min-h-64 rounded-md border border-line bg-canvas px-6 py-5">
          {value.trim() ? <ArticleBody markdown={value} /> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
        </div>
      ) : null}
      <div className="mt-1.5 flex justify-between text-xs">
        {error ? <span className="text-danger">{error}</span> : <span className="text-muted">{hint ?? "Markdown: ## headings, **bold**, lists, links, tables. Raw HTML is not rendered."}</span>}
        <span className="tabular-nums text-muted">{words} words · ~{Math.max(1, Math.round(words / 220))} min</span>
      </div>
    </div>
  );
}
