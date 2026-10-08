/** Minimal, accessible daily bar chart (server-rendered SVG, no chart library). */
export function BarChart({
  data,
  color = "var(--color-ink)",
  label,
}: {
  data: { day: string; value: number }[];
  color?: string;
  label: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  const w = 100 / Math.max(1, data.length);
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return (
    <figure>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={`${label}: ${total} total over ${data.length} days, peak ${max}`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2="100" y1={40 - f * 38} y2={40 - f * 38} stroke="var(--color-line-soft)" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * 38;
          return (
            <rect key={d.day} x={i * w + w * 0.15} y={40 - h} width={w * 0.7} height={Math.max(h, d.value > 0 ? 0.6 : 0)} fill={color} rx="0.3">
              <title>{`${fmt(d.day)}: ${d.value}`}</title>
            </rect>
          );
        })}
        <line x1="0" x2="100" y1="39.9" y2="39.9" stroke="var(--color-line)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{data[0] ? fmt(data[0].day) : ""}</span>
        <span>peak {max === 1 && total === 0 ? 0 : max}/day</span>
        <span>{data.at(-1) ? fmt(data.at(-1)!.day) : ""}</span>
      </figcaption>
    </figure>
  );
}
