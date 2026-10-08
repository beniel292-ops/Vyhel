import "server-only";
import { z } from "zod";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor/i;

export function isBot(userAgent: string | null) {
  return !userAgent || BOT.test(userAgent);
}

const token = z
  .string()
  .max(64)
  .transform((v) => v.toLowerCase().replace(/[^a-z0-9_\-.]/g, "_"))
  .optional()
  .nullable();

export const clickSchema = z.object({
  productId: z.string().uuid(),
  linkId: z.string().uuid().optional().nullable(),
  placement: z.string().max(48).regex(/^[a-z0-9_]+$/),
  pageType: z.enum(["product", "guide", "collection", "category", "home"]),
  pageId: z.string().uuid().optional().nullable(),
  pagePath: z.string().max(200).optional().nullable(),
  source: token,
  campaign: token,
});

export const EVENT_TYPES = [
  "page_view",
  "product_view",
  "guide_view",
  "collection_view",
  "category_view",
  "search",
  "cta_click",
] as const;

export const eventSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  path: z.string().max(200).optional().nullable(),
  entityType: z.enum(["product", "guide", "collection", "category"]).optional().nullable(),
  entityId: z.string().uuid().optional().nullable(),
  source: token,
  campaign: token,
  sessionId: z.string().max(64).optional().nullable(),
  meta: z.record(z.string().max(32), z.union([z.string().max(120), z.number(), z.boolean(), z.null()])).optional().nullable(),
});
