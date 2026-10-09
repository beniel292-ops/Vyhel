import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True only for the id of a category that actually exists. Never trust a client-supplied id. */
export async function categoryExists(id: string | null | undefined): Promise<boolean> {
  if (!id || !UUID_RE.test(id)) return false;
  const [row] = await getDb().select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.id, id));
  return Boolean(row);
}
