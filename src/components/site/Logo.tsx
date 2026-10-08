import Link from "next/link";
import { cn } from "@/lib/utils";

/** VYHEL wordmark. Custom tracking, no symbol — works from favicon to Instagram avatar. */
export function Wordmark({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <span
      className={cn(
        "font-sans text-[15px] font-semibold uppercase leading-none tracking-[0.34em]",
        tone === "light" ? "text-white" : "text-ink",
        className,
      )}
    >
      Vyhe<span className="tracking-normal">l</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Vyhel — home" className={cn("inline-flex items-center", className)}>
      <Wordmark />
    </Link>
  );
}
