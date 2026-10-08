import { ConfirmButton } from "@/components/admin/form";
import { AdminPageHeader, FilterForm, Panel } from "@/components/admin/kit";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { deleteMedia } from "@/server/actions/media";
import { listMedia } from "@/server/queries/admin";
import { CopyButton } from "./CopyButton";
import { UploadForm } from "./UploadForm";

export const metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const items = await listMedia(q);
  return (
    <>
      <AdminPageHeader
        title="Media"
        description={process.env.BLOB_READ_WRITE_TOKEN ? "Stored in Vercel Blob." : "Stored in the database. Set BLOB_READ_WRITE_TOKEN to use Vercel Blob instead."}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <FilterForm>
            <input name="q" defaultValue={q} placeholder="Search filename, alt or source…" className="input h-9 !w-72 !py-1" aria-label="Search media" />
          </FilterForm>
          {items.length === 0 ? (
            <EmptyState title="No images yet." description="Upload authorised product photography to use across Vyhel." />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((m) => (
                <li key={m.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                  <img src={m.url} alt={m.alt} loading="lazy" className="aspect-square w-full bg-sunken object-cover" />
                  <div className="p-2.5">
                    <p className="truncate text-[12.5px] font-medium text-ink" title={m.filename}>{m.filename}</p>
                    <p className="truncate text-[11px] text-muted" title={m.source}>{m.source}</p>
                    <p className="text-[11px] text-faint">
                      {m.width && m.height ? `${m.width}×${m.height} · ` : ""}
                      {Math.round(m.sizeBytes / 1024)} KB · {formatDate(m.createdAt)}
                    </p>
                    <div className="mt-1.5 flex gap-1">
                      <CopyButton value={m.url} />
                      <ConfirmButton action={deleteMedia} fields={{ id: m.id }} label="Delete" title="Delete image?" body="Pages using this image will show a placeholder instead." confirmLabel="Delete" className="!h-auto !px-2 !py-1 !text-[12px] text-danger" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Panel title="Upload" className="self-start">
          <UploadForm />
        </Panel>
      </div>
    </>
  );
}
