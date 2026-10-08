import "server-only";
import { cache } from "react";
import { getDb, isDatabaseConfigured, schema } from "@/db";
import { DEFAULT_SETTINGS, type SiteSettings } from "./settings-shape";

export { DEFAULT_SETTINGS, type SiteSettings } from "./settings-shape";

/** Server-side default Amazon Associate tag (AMAZON_ASSOCIATE_TAG). Admin → Settings overrides it. */
function envAssociateTag() {
  const t = process.env.AMAZON_ASSOCIATE_TAG?.trim() ?? "";
  return /^[a-z0-9-]{1,40}$/i.test(t) ? t : "";
}

function withDefaults(site?: Partial<SiteSettings>): SiteSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(site ?? {}) };
  if (!merged.amazonAssociateId) merged.amazonAssociateId = envAssociateTag();
  return merged;
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  if (!isDatabaseConfigured()) return withDefaults();
  try {
    const rows = await getDb().select().from(schema.siteSettings);
    const site = rows.find((r) => r.key === "site")?.value as Partial<SiteSettings> | undefined;
    return withDefaults(site);
  } catch (err) {
    console.error("[settings] falling back to defaults", err);
    return withDefaults();
  }
});
