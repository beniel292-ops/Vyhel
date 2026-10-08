import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { SearchDialog } from "@/components/site/SearchDialog";
import type { SiteSettings } from "@/lib/settings-shape";

/** Renders public components exactly as visitors see them, with a preview banner. */
export function PreviewFrame({ status, editHref, settings, children }: { status: string; editHref: string; settings: SiteSettings; children: ReactNode }) {
  return (
    <div>
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 bg-ink px-4 py-2.5 text-[13px] text-white md:px-8">
        <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">Preview</span>
        <span className="text-white/75">
          Status: <span className="capitalize text-white">{status}</span>
          {status !== "published" ? " — visitors can't see this yet." : " — this is live."}
        </span>
        <Link href={editHref} className="ml-auto rounded bg-white px-3 py-1 font-medium text-ink">
          Back to editor
        </Link>
      </div>
      <div className="bg-canvas">
        <Navbar />
        <div className="pointer-events-auto">{children}</div>
        <Footer settings={settings} />
        <SearchDialog />
      </div>
    </div>
  );
}
