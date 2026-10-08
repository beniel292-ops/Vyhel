"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

/**
 * Renders an image on top of the editorial placeholder. If the image fails to load (deleted
 * media, dead external URL), it removes itself so the placeholder underneath shows instead of a
 * broken-image icon.
 */
export function FallbackImage({
  src,
  alt,
  optimize,
  sizes,
  priority,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  optimize: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Shown instead of the image if it fails to load. */
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <>{fallback}</>;
  // An image that already failed before React hydrated never fires onError — catch that case too.
  const checkAlreadyFailed = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0 && el.currentSrc) setFailed(src);
  };
  return optimize ? (
    <Image ref={checkAlreadyFailed} src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} onError={() => setFailed(src)} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided external URL; host unknown at build time
    <img
      ref={checkAlreadyFailed}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 size-full ${className ?? ""}`}
      onError={() => setFailed(src)}
    />
  );
}
