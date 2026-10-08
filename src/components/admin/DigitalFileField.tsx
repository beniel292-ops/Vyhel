"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useFieldError } from "./form";

/**
 * Private deliverable picker for DIGITAL products. Uploads through /api/digital-products/files
 * (database storage) or straight to the private S3/R2 bucket via a presigned URL.
 * The file never gets a public URL.
 */
export function DigitalFileField({
  defaultFile,
  driver,
}: {
  defaultFile: { id: string; filename: string; sizeBytes: number } | null;
  driver: "database" | "s3";
}) {
  const [file, setFile] = useState(defaultFile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fieldError = useFieldError("fileId");

  async function upload(f: File) {
    setBusy(true);
    setErr(null);
    try {
      let res: Response;
      if (driver === "s3") {
        const pre = await fetch("/api/digital-products/files", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "presign", filename: f.name }),
        });
        const p = (await pre.json()) as { url?: string; key?: string; error?: string };
        if (!pre.ok || !p.url) throw new Error(p.error ?? "Couldn't start upload.");
        const put = await fetch(p.url, { method: "PUT", body: f });
        if (!put.ok) throw new Error("Upload to storage failed. Check the bucket's CORS settings.");
        res = await fetch("/api/digital-products/files", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "register", key: p.key, filename: f.name }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", f);
        res = await fetch("/api/digital-products/files", { method: "POST", body: fd });
      }
      const data = (await res.json().catch(() => ({}))) as { file?: { id: string; filename: string; sizeBytes: number }; error?: string };
      if (!res.ok || !data.file) throw new Error(data.error ?? (res.status === 413 ? "File too large for this server." : "Upload failed."));
      setFile(data.file);
      setUploaded(true);
      input.current?.form?.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name="fileId" value={file?.id ?? ""} />
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-canvas/50 p-4">
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-medium text-ink">{file.filename}</p>
              <p className="text-xs text-muted">{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB · private · delivered only through secure links</p>
            </>
          ) : (
            <p className="text-sm text-muted">
              No file yet. Customers receive this file after paying.
              {defaultFile ? " Save to confirm removal — an active product can't be saved without a file, and past buyers can't download until a file is added again." : ""}
            </p>
          )}
        </div>
        <input
          ref={input}
          type="file"
          className="sr-only"
          id="digital-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : file ? "Replace file" : "Upload file"}
        </Button>
        {file ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setFile(null);
              setUploaded(false);
              input.current?.form?.dispatchEvent(new Event("change", { bubbles: true }));
            }}
          >
            Remove file
          </Button>
        ) : null}
      </div>
      {err || (fieldError && !uploaded) ? <p className="mt-1.5 text-xs text-danger">{err ?? fieldError}</p> : null}
      <p className="field-hint">
        PDF, ZIP, EPUB, images, audio/video, Office or font files.{" "}
        {driver === "database" ? "Stored privately in the database (keep files under ~4 MB on Vercel; set up S3/R2 for larger files)." : "Stored in your private S3/R2 bucket."}
      </p>
    </div>
  );
}
