"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { inspectAffiliateLink } from "@/lib/amazon";
import { createCategoryInline } from "@/server/actions/categories";
import { cn } from "@/lib/utils";
import { Field, Modal, TextField, useFieldError } from "./form";

type MediaOption = { id: string; url: string; alt: string; source: string; filename: string };

type CategoryOption = { id: string; name: string };

/**
 * Category select for product forms. Lists the real categories from the database, explains when
 * there are none, and lets an admin/editor create one by name without leaving (or submitting) the form.
 * The server re-checks that the submitted id is a real category.
 */
export function CategoryField({
  categories,
  defaultValue,
  required,
  label = "Category",
  name = "categoryId",
}: {
  categories: CategoryOption[];
  defaultValue?: string | null;
  required?: boolean;
  label?: string;
  name?: string;
}) {
  const [options, setOptions] = useState(categories);
  const [value, setValue] = useState(defaultValue ?? "");
  const [adding, setAdding] = useState(categories.length === 0);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = options.length === 0;

  async function create() {
    const n = newName.trim();
    if (!n || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createCategoryInline(n);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setOptions((o) => (o.some((c) => c.id === r.category.id) ? o : [...o, r.category].sort((a, b) => a.name.localeCompare(b.name))));
      setValue(r.category.id);
      setNewName("");
      setAdding(false);
    } catch {
      setError(navigator.onLine === false ? "You're offline — reconnect and try again." : "Couldn't create the category. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field
      label={label}
      name={name}
      required={required}
      hint={empty ? undefined : <>Manage the list in <Link href="/admin/categories" target="_blank" className="underline">Categories</Link>.</>}
    >
      {(id, invalid) => (
        <div className="grid gap-2">
          <select
            id={id}
            name={name}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={empty}
            aria-invalid={invalid || undefined}
            className={cn("input", invalid && "!border-danger")}
          >
            <option value="">{empty ? "No categories yet" : "Choose…"}</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {adding ? (
            <div className="flex gap-2">
              {/* No `name`: this lives inside the product form and must not be submitted with it. */}
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void create();
                  }
                }}
                placeholder={empty ? "Create your first category, e.g. Tech" : "New category name"}
                aria-label="New category name"
                maxLength={80}
                className="input min-w-0 flex-1"
              />
              <Button variant="secondary" onClick={() => void create()} disabled={busy || !newName.trim()} className="shrink-0">
                {busy ? "Adding…" : "Add"}
              </Button>
              {!empty ? (
                <Button variant="ghost" onClick={() => setAdding(false)} className="shrink-0">
                  Cancel
                </Button>
              ) : null}
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="justify-self-start text-xs text-ink-soft underline hover:text-ink">
              + New category
            </button>
          )}
          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : empty ? (
            <p className="text-xs text-muted">No categories exist yet. Type a name and press Add — it&rsquo;s saved straight away and selected here.</p>
          ) : null}
        </div>
      )}
    </Field>
  );
}

/**
 * Image field: choose from the media library (preferred — every item has a recorded source)
 * or paste a URL you have rights to use. Source/credit is required whenever an image is set.
 */
export function ImageField({
  urlName,
  altName,
  sourceName,
  defaultUrl,
  defaultAlt,
  defaultSource,
  media,
  label = "Image",
}: {
  urlName: string;
  altName: string;
  sourceName?: string;
  defaultUrl?: string | null;
  defaultAlt?: string | null;
  defaultSource?: string | null;
  media: MediaOption[];
  label?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [alt, setAlt] = useState(defaultAlt ?? "");
  const [source, setSource] = useState(defaultSource ?? "");
  const [library, setLibrary] = useState(media);
  const [q, setQ] = useState("");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [sourceFromLibrary, setSourceFromLibrary] = useState(false);
  const filtered = library.filter((m) => !q || `${m.filename} ${m.alt}`.toLowerCase().includes(q.toLowerCase()));

  const choose = (m: MediaOption) => {
    setUrl(m.url);
    if (!alt) setAlt(m.alt);
    setSource(m.source);
    setSourceFromLibrary(Boolean(m.source));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-line bg-sunken">
        {url && failedUrl !== url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary URL
          <img src={url} alt="" className="size-full object-cover" onError={() => setFailedUrl(url)} />
        ) : url ? (
          <span className="px-2 text-center text-[11px] text-danger">This image URL couldn&rsquo;t be loaded</span>
        ) : (
          <span className="px-2 text-center text-[11px] text-muted">No image — a typographic placeholder is shown</span>
        )}
      </div>
      <div className="grid gap-3">
        <Field label={label} name={urlName} hint="Only use images Vyhel is authorised to use: your own photos, licensed images, or approved Amazon assets.">
          {(id, invalid) => (
            <div className="flex flex-wrap gap-2">
              <input
                id={id}
                name={urlName}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Upload, choose from library or paste a URL"
                aria-invalid={invalid || undefined}
                className={cn("input min-w-0 flex-1", invalid && "!border-danger")}
              />
              <Modal
                wide
                title="Choose an image"
                trigger={(open) => (
                  <Button variant="secondary" onClick={open} className="shrink-0">
                    Upload / Library
                  </Button>
                )}
              >
                {(close) => (
                  <div className="grid gap-6">
                    <InlineImageUpload
                      onUploaded={(m) => {
                        setLibrary((l) => [m, ...l]);
                        choose(m);
                        close();
                      }}
                    />
                    <div>
                      <p className="field-label">Or choose from the media library</p>
                      <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={noSubmit} placeholder="Search media…" className="input mb-4" aria-label="Search media" />
                      {filtered.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted">No images in the library yet.</p>
                      ) : (
                        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                          {filtered.map((m) => (
                            <li key={m.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  choose(m);
                                  close();
                                }}
                                className="group block w-full text-left"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail */}
                                <img src={m.url} alt={m.alt} className="aspect-square w-full rounded-md border border-line object-cover group-hover:border-ink" />
                                <span className="mt-1 block truncate text-[11px] text-muted">{m.filename}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </Modal>
              {url ? (
                <Button variant="ghost" onClick={() => setUrl("")} className="shrink-0">
                  Remove
                </Button>
              ) : null}
            </div>
          )}
        </Field>
        <div className={cn("grid gap-3", sourceName && "sm:grid-cols-2")}>
          <TextField label="Alt text" name={altName} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" />
          {sourceName ? (
            <TextField
              label="Image source / rights"
              name={sourceName}
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setSourceFromLibrary(false);
              }}
              placeholder="e.g. Vyhel original photo"
              required={Boolean(url)}
              hint={
                sourceFromLibrary
                  ? "Copied from this image's media-library record. Check it covers using the image on this product."
                  : "Who owns it and why Vyhel may use it (your photo, licence, or permitted Amazon asset)."
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Enter inside the dialog must not submit the surrounding product form. */
const noSubmit = (e: React.KeyboardEvent) => {
  if (e.key === "Enter") e.preventDefault();
};

/**
 * Upload a new image without leaving the form. Rendered inside the parent <form> (in a dialog),
 * so its inputs deliberately have no `name` and it posts with fetch to /api/media.
 */
function InlineImageUpload({ onUploaded }: { onUploaded: (m: MediaOption) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [source, setSource] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    setError(null);
    if (!file) return setError("Choose an image file.");
    if (file.size > MAX_IMAGE_BYTES) return setError(`“${file.name}” is ${(file.size / 1048576).toFixed(1)} MB — images must be 5 MB or smaller.`);
    if (!alt.trim() || !source.trim()) return setError("Add alt text and the image source.");
    if (!authorized) return setError("Confirm Vyhel has the right to use this image.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt", alt.trim());
      fd.append("source", source.trim());
      fd.append("authorized", "true");
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { media?: MediaOption; error?: string; errors?: Record<string, string> };
      if (!res.ok || !data.media) throw new Error(Object.values(data.errors ?? {})[0] ?? data.error ?? "Upload failed.");
      onUploaded(data.media);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <p className="field-label">Upload a new image</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          aria-label="Image file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm sm:col-span-2"
        />
        <input value={alt} onChange={(e) => setAlt(e.target.value)} onKeyDown={noSubmit} placeholder="Alt text (what the image shows)" aria-label="Alt text" className="input" />
        <input value={source} onChange={(e) => setSource(e.target.value)} onKeyDown={noSubmit} placeholder="Source, e.g. Vyhel original photo" aria-label="Image source" className="input" />
        <label className="flex items-start gap-2 text-[13px] text-ink-soft sm:col-span-2">
          <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
          Vyhel has the right to use this image (own photo, licensed image, or approved Amazon asset).
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <Button className="mt-3" onClick={upload} disabled={busy}>
        {busy ? "Uploading…" : "Upload & use image"}
      </Button>
      <p className="field-hint">JPEG, PNG, WebP, AVIF or GIF · max 5 MB. Saved to the media library too.</p>
    </div>
  );
}

/** Searchable checkbox list for many-to-many relationships. */
export function MultiPicker({
  name,
  marker,
  label,
  hint,
  options,
  defaultSelected,
  exclude,
}: {
  name: string;
  marker: string;
  label: string;
  hint?: string;
  options: { id: string; name: string; status?: string }[];
  defaultSelected: string[];
  exclude?: string;
}) {
  const [selected, setSelected] = useState(new Set(defaultSelected));
  const [q, setQ] = useState("");
  const error = useFieldError(name);
  const list = options.filter((o) => o.id !== exclude && (!q || o.name.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <input type="hidden" name={marker} value="1" />
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="field-label !mb-0">{label}</span>
        <span className="text-xs text-muted">{selected.size} selected</span>
      </div>
      {options.length > 8 ? <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="input mb-2 !py-1.5" /> : null}
      <ul className="max-h-56 overflow-y-auto rounded-md border border-line bg-canvas/50 p-1">
        {list.length === 0 ? <li className="px-2 py-3 text-xs text-muted">Nothing to choose yet.</li> : null}
        {list.map((o) => (
          <li key={o.id}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-surface">
              <input
                type="checkbox"
                name={name}
                value={o.id}
                checked={selected.has(o.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o.id);
                  else next.delete(o.id);
                  setSelected(next);
                }}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="min-w-0 flex-1 truncate text-ink">{o.name}</span>
              {o.status && o.status !== "published" ? <span className="text-[11px] capitalize text-muted">{o.status}</span> : null}
            </label>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

/** Ordered product list with optional per-item editorial note (collections). */
export function OrderedProductPicker({
  options,
  defaultItems,
}: {
  options: { id: string; name: string; status?: string }[];
  defaultItems: { id: string; note: string | null }[];
}) {
  const [items, setItems] = useState(defaultItems.map((i) => ({ id: i.id, note: i.note ?? "" })));
  const [adding, setAdding] = useState("");
  const error = useFieldError("productIds");
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const available = options.filter((o) => !items.some((i) => i.id === o.id));
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    setItems(next);
  };
  return (
    <div>
      <p className="field-label">Products, in display order</p>
      <p className="field-hint !mt-0 mb-3">The first product is featured at the top of the collection page.</p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={item.id} className="rounded-md border border-line bg-canvas/50 p-3">
            <input type="hidden" name="productIds" value={item.id} />
            <div className="flex items-center gap-2">
              <span className="w-5 text-xs tabular-nums text-muted">{i + 1}</span>
              <span className="flex-1 truncate text-sm font-medium text-ink">
                {byId.get(item.id)?.name ?? "Unknown product"}
                {i === 0 ? <span className="ml-2 text-[11px] font-normal text-accent">Featured</span> : null}
              </span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded px-1.5 text-muted hover:bg-sunken disabled:opacity-30" aria-label="Move up">↑</button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded px-1.5 text-muted hover:bg-sunken disabled:opacity-30" aria-label="Move down">↓</button>
              <button type="button" onClick={() => setItems(items.filter((x) => x.id !== item.id))} className="rounded px-1.5 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove">✕</button>
            </div>
            <input
              name={`note_${item.id}`}
              value={item.note}
              onChange={(e) => setItems(items.map((x) => (x.id === item.id ? { ...x, note: e.target.value } : x)))}
              placeholder="Optional note: why it belongs in this collection"
              className="input mt-2 !py-1.5 text-[13px]"
            />
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <select value={adding} onChange={(e) => setAdding(e.target.value)} className="input min-w-0" aria-label="Add product">
          <option value="">Add a product…</option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.status && o.status !== "published" ? ` (${o.status})` : ""}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={!adding}
          onClick={() => {
            setItems([...items, { id: adding, note: "" }]);
            setAdding("");
          }}
        >
          Add
        </Button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function FaqEditor({ defaultItems }: { defaultItems: { question: string; answer: string }[] }) {
  const [items, setItems] = useState(defaultItems.length ? defaultItems : []);
  return (
    <div>
      <p className="field-label">FAQ</p>
      <p className="field-hint !mt-0 mb-3">Only add questions you can answer accurately. Empty rows are ignored.</p>
      <div className="space-y-3">
        {items.map((f, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-line bg-canvas/50 p-3">
            <div className="flex gap-2">
              <input
                name="faqQuestion"
                value={f.question}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                placeholder="Question"
                className="input"
              />
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded px-2 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remove question">
                ✕
              </button>
            </div>
            <textarea
              name="faqAnswer"
              value={f.answer}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
              placeholder="Answer"
              rows={2}
              className="input"
            />
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => setItems([...items, { question: "", answer: "" }])}>
        + Add question
      </Button>
    </div>
  );
}

const SCORE_FIELDS = [
  ["usefulnessScore", "Usefulness"],
  ["easeScore", "Ease of use"],
  ["versatilityScore", "Versatility"],
  ["valueScore", "Value"],
  ["designScore", "Design"],
] as const;

export function ScoreFields({ defaults }: { defaults: Record<string, number | null> }) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries([...SCORE_FIELDS.map(([k]) => k), "vyhelScore"].map((k) => [k, defaults[k]?.toString() ?? ""])),
  );
  const parts = SCORE_FIELDS.map(([k]) => Number(vals[k])).filter((n, i) => vals[SCORE_FIELDS[i][0]] !== "" && Number.isFinite(n));
  const avg = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : null;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {SCORE_FIELDS.map(([k, label]) => (
          <TextField
            key={k}
            label={label}
            name={k}
            type="number"
            inputMode="decimal"
            min={0}
            max={10}
            step={0.5}
            value={vals[k]}
            onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
          />
        ))}
      </div>
      <TextField
        label="Vyhel score (overall)"
        name="vyhelScore"
        type="number"
        inputMode="decimal"
        min={0}
        max={10}
        step={0.1}
        value={vals.vyhelScore}
        onChange={(e) => setVals({ ...vals, vyhelScore: e.target.value })}
        placeholder={avg !== null ? `${avg} (average)` : "Leave blank to use the average"}
        hint={avg !== null ? `Average of the breakdown: ${avg.toFixed(1)}. Leave blank to use it.` : "Editorial score, 0–10. Not an Amazon rating."}
        className="sm:max-w-xs"
      />
    </div>
  );
}

/** Special Link input with live, local inspection (never rewrites the link). */
export function SpecialLinkField({ defaultValue, associateId, required }: { defaultValue?: string | null; associateId?: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const check = value ? inspectAffiliateLink(value, associateId || null) : null;
  return (
    <div>
      <TextField
        label="Affiliate link (Amazon Special Link)"
        name="specialLink"
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://amzn.to/… or https://www.amazon.in/dp/…?tag=…"
        hint="Paste exactly what SiteStripe or Associates Central gives you. Vyhel never edits this link."
        autoComplete="off"
        spellCheck={false}
      />
      {check ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {check.isAmazon ? <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent-strong">Amazon link</span> : null}
          {check.tag ? <span className="rounded bg-sunken px-1.5 py-0.5 text-ink-soft">tag: {check.tag}</span> : null}
          {check.asin ? <span className="rounded bg-sunken px-1.5 py-0.5 text-ink-soft">ASIN: {check.asin}</span> : null}
          {check.isShortLink ? <span className="rounded bg-sunken px-1.5 py-0.5 text-ink-soft">SiteStripe short link</span> : null}
          {[...check.errors, ...check.warnings].map((w) => (
            <span key={w} className={cn("rounded px-1.5 py-0.5", check.errors.includes(w) ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")}>
              {w}
            </span>
          ))}
          {check.ok ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="ml-auto font-medium text-ink underline underline-offset-2">
              Test destination ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Slug input that follows the name until the editor edits it. */
export function SlugPair({
  nameLabel,
  nameField,
  defaultName,
  defaultSlug,
  prefix,
  locked,
}: {
  nameLabel: string;
  nameField: string;
  defaultName?: string;
  defaultSlug?: string;
  prefix: string;
  locked?: boolean;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [touched, setTouched] = useState(Boolean(defaultSlug));
  const auto = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label={nameLabel}
        name={nameField}
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!touched) setSlug(auto(e.target.value));
        }}
      />
      <TextField
        label="Slug"
        name="slug"
        value={slug}
        onChange={(e) => {
          setTouched(true);
          setSlug(e.target.value);
        }}
        hint={
          locked ? (
            <>Changing a published URL breaks existing links. {prefix}{slug}</>
          ) : (
            <>
              {prefix}
              {slug || "…"}
            </>
          )
        }
        spellCheck={false}
      />
    </div>
  );
}
