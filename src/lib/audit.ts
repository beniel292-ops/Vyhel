import "server-only";
import { getDb, schema } from "@/db";
import type { SessionUser } from "./auth/session";

export async function audit(
  user: SessionUser,
  entityType: string,
  entityId: string | null,
  action: string,
  summary?: string,
  changes?: Record<string, unknown>,
) {
  try {
    await getDb().insert(schema.auditLogs).values({
      userId: user.id,
      userEmail: user.email,
      entityType,
      entityId,
      action,
      summary,
      changes,
    });
  } catch (err) {
    // Auditing must never block the editor's actual work.
    console.error("[audit] failed", err);
  }
}
