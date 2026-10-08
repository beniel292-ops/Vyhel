import { cn } from "@/lib/utils";
import { FallbackImage } from "./FallbackImage";

const TONES: Record<string, string> = {
  tech: "#e6e3db",
  college: "#e9e4d6",
  "car-and-bike": "#e2e4de",
  home: "#ece5dc",
  grooming: "#e9e2e0",
};

function isOptimizable(src: string) {
  return src.startsWith("/") || /\.public\.blob\.vercel-storage\.com$/.test(safeHost(src));
}
function safeHost(src: string) {
  try {
    return new URL(src).hostname;
  } catch {
    return "";
  }
}

function initials(name: string) {
  return name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Renders an authorised image, or a calm typographic placeholder when no image has been added.
 * Vyhel never fabricates product renders.
 */
export function EditorialImage({
  src,
  alt,
  name,
  tone,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
  className,
  rounded = true,
  label,
  compact,
}: {
  src?: string | null;
  alt?: string | null;
  name: string;
  tone?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
  rounded?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const bg = (tone && TONES[tone]) || "#ebe8e1";
  return (
    <div
      className={cn("relative overflow-hidden", rounded && "rounded-[var(--radius-card)]", className)}
      style={{ backgroundColor: bg, containerType: "inline-size" }}
    >
      {src ? (
        <FallbackImage
            fallback={
              <div role="img" aria-label={alt || name} className="absolute inset-0 flex flex-col justify-between p-[7cqw]">
                <span className="select-none text-[clamp(8px,2.6cqw,11px)] font-semibold uppercase tracking-[0.28em] text-ink/25">{label ?? "Vyhel"}</span>
                <span className="display line-clamp-4 max-w-[92%] select-none text-[clamp(15px,9.5cqw,46px)] leading-[1.02] text-ink/45">{name}</span>
              </div>
            }
            src={src}
            alt={alt || name}
            optimize={isOptimizable(src)}
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-300 ease-[var(--ease-calm)] group-hover:scale-[1.025]"
          />
      ) : compact ? (
        <div role="img" aria-label={alt || name} className="absolute inset-0 flex items-center justify-center">
          <span className="display select-none text-[2rem] text-ink/[0.16]">{initials(name)}</span>
        </div>
      ) : (
        <div
          role="img"
          aria-label={alt || name}
          className="absolute inset-0 flex flex-col justify-between p-[7cqw]"
        >
          <span className="select-none text-[clamp(8px,2.6cqw,11px)] font-semibold uppercase tracking-[0.28em] text-ink/25">
            {label ?? "Vyhel"}
          </span>
          <span className="display line-clamp-4 max-w-[92%] select-none text-[clamp(15px,9.5cqw,46px)] leading-[1.02] text-ink/45 transition-colors duration-300 group-hover:text-ink/60">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}
