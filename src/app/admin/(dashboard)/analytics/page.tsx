import Link from "next/link";
import { BarChart } from "@/components/admin/BarChart";
import { AdminPageHeader, NoData, Panel, Stat, Table, Td, Th } from "@/components/admin/kit";
import { cn, formatNumber } from "@/lib/utils";
import { getAnalytics } from "@/server/queries/admin";

export const metadata = { title: "Analytics" };

const RANGES = [7, 30, 90];
const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.range)) ? Number(sp.range) : 30;
  const a = await getAnalytics(days);
  const empty = a.pageViews === 0 && a.clicks === 0;
  const bestSource = a.sources[0];

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="First-party, aggregate, privacy-friendly. No IPs, no cookies, no personal profiles."
        actions={
          <div className="flex rounded-md border border-line bg-surface p-0.5 text-[13px]">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/analytics?range=${r}`} aria-current={r === days ? "page" : undefined} className={cn("rounded px-3 py-1", r === days ? "bg-ink text-white" : "text-muted hover:text-ink")}>
                {r} days
              </Link>
            ))}
          </div>
        }
      />

      {empty ? (
        <div className="mb-6 rounded-lg border border-dashed border-line bg-surface px-5 py-8 text-center">
          <p className="font-medium text-ink">No data yet. Your first clicks will appear here.</p>
          <p className="mt-1 text-sm text-muted">Page views and Amazon clicks are recorded automatically once visitors arrive.</p>
        </div>
      ) : null}

      <section aria-label="Traffic and affiliate totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Page views" value={formatNumber(a.pageViews)} />
        <Stat label="Sessions" value={formatNumber(a.sessions)} hint="Per-tab, anonymous" />
        <Stat label="Amazon clicks" value={formatNumber(a.clicks)} />
        <Stat label="Product page CTR" value={pct(a.ctr)} hint={`${formatNumber(a.productViews)} product views`} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Page views per day">
          <BarChart data={a.daily.map((d) => ({ day: d.day, value: d.views }))} label="Page views per day" color="var(--color-ink-soft)" />
        </Panel>
        <Panel title="Amazon clicks per day">
          <BarChart data={a.daily.map((d) => ({ day: d.day, value: d.clicks }))} label="Amazon clicks per day" color="var(--color-accent)" />
        </Panel>
      </div>

      <section aria-label="Highlights" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Best product page" value={<span className="text-base">{a.topProducts[0]?.name ?? "—"}</span>} hint={a.topProducts[0] ? `${a.topProducts[0].clicks} clicks` : "No data yet"} />
        <Stat label="Best guide" value={<span className="text-base">{a.topGuides[0]?.title ?? "—"}</span>} hint={a.topGuides[0] ? `${a.topGuides[0].views} views` : "No data yet"} />
        <Stat label="Best collection" value={<span className="text-base">{a.topCollections[0]?.name ?? "—"}</span>} hint={a.topCollections[0] ? `${a.topCollections[0].views} views` : "No data yet"} />
        <Stat label="Best traffic source" value={<span className="text-base capitalize">{bestSource?.source ?? "—"}</span>} hint={bestSource ? `${bestSource.visits} sessions · ${bestSource.clicks} clicks` : "No data yet"} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Top products by Amazon clicks">
          {a.topProducts.length === 0 ? (
            <NoData />
          ) : (
            <Table className="border-0">
              <thead><tr><Th>Product</Th><Th className="text-right">Views</Th><Th className="text-right">Clicks</Th><Th className="text-right">CTR</Th></tr></thead>
              <tbody>
                {a.topProducts.map((p) => (
                  <tr key={p.id}>
                    <Td><Link href={`/admin/products/${p.id}`} className="text-ink hover:underline">{p.name}</Link></Td>
                    <Td className="text-right tabular-nums">{p.views}</Td>
                    <Td className="text-right tabular-nums">{p.clicks}</Td>
                    <Td className="text-right tabular-nums">{pct(p.views ? p.clicks / p.views : null)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Sources">
          {a.sources.length === 0 ? (
            <NoData />
          ) : (
            <ul className="space-y-2.5">
              {a.sources.map((s) => {
                const max = Math.max(...a.sources.map((x) => Number(x.visits)), 1);
                return (
                  <li key={s.source} className="grid grid-cols-[6rem_1fr_6.5rem] items-center gap-3 text-[13px]">
                    <span className="truncate capitalize text-ink">{s.source}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-line-soft"><span className="block h-full rounded-full bg-ink" style={{ width: `${(Number(s.visits) / max) * 100}%` }} /></span>
                    <span className="text-right tabular-nums text-muted">{s.visits} · {s.clicks} clicks</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Top guides">
          {a.topGuides.length === 0 ? <NoData>No guide views yet.</NoData> : (
            <ul className="divide-y divide-line-soft text-[13px]">
              {a.topGuides.map((g) => (
                <li key={g.id} className="flex justify-between gap-3 py-2"><span className="truncate text-ink">{g.title}</span><span className="shrink-0 tabular-nums text-muted">{g.views} views · {g.clicks} clicks</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Click placements">
          {a.placements.length === 0 ? <NoData /> : (
            <ul className="divide-y divide-line-soft text-[13px]">
              {a.placements.map((p) => (
                <li key={p.placement} className="flex justify-between py-2"><span className="font-mono text-[12px] text-ink-soft">{p.placement}</span><span className="tabular-nums text-muted">{p.clicks}</span></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Top categories by clicks">
          {a.topCategories.length === 0 ? <NoData /> : (
            <ul className="divide-y divide-line-soft text-[13px]">
              {a.topCategories.map((c) => (<li key={c.name} className="flex justify-between py-2"><span className="text-ink">{c.name}</span><span className="tabular-nums text-muted">{c.clicks}</span></li>))}
            </ul>
          )}
        </Panel>
        <Panel title="Top pages">
          {a.topPages.length === 0 ? <NoData>No page views yet.</NoData> : (
            <ul className="divide-y divide-line-soft text-[13px]">
              {a.topPages.map((p) => (<li key={p.path ?? "?"} className="flex justify-between gap-3 py-2"><span className="truncate font-mono text-[12px] text-ink-soft">{p.path}</span><span className="tabular-nums text-muted">{p.views}</span></li>))}
            </ul>
          )}
        </Panel>
        <Panel title="What people search for">
          {a.searches.length === 0 ? <NoData>No searches yet.</NoData> : (
            <ul className="divide-y divide-line-soft text-[13px]">
              {a.searches.map((s) => (<li key={s.q} className="flex justify-between py-2"><span className="text-ink">{s.q}</span><span className="tabular-nums text-muted">{s.n}</span></li>))}
            </ul>
          )}
        </Panel>
      </div>
      <p className="mt-6 text-xs text-muted">
        Tip: add <code className="rounded bg-sunken px-1">?source=instagram&amp;campaign=student_setup</code> to links you share so clicks are attributed.
      </p>
    </>
  );
}
