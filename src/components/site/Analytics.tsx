"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getAttribution, trackEvent } from "@/lib/analytics/client";

/** Sends one page_view per client-side navigation. */
export function PageViewTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    getAttribution();
    trackEvent("page_view");
  }, [pathname]);
  return null;
}

const recent = new Map<string, number>();

/** Drop into a page to record an entity view (product_view, guide_view, …). */
export function TrackView({
  event,
  entityType,
  entityId,
}: {
  event: "product_view" | "guide_view" | "collection_view" | "category_view";
  entityType: string;
  entityId: string;
}) {
  useEffect(() => {
    // Guard against double effects (React dev mode, fast re-renders): one view per entity per few seconds.
    const key = `${event}:${entityId}`;
    const now = Date.now();
    if ((recent.get(key) ?? 0) > now - 3000) return;
    recent.set(key, now);
    trackEvent(event, { entityType, entityId });
  }, [event, entityType, entityId]);
  return null;
}
