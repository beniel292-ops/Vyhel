import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One connection pool per server instance. On Neon, use the *pooled* connection string
 * (host contains `-pooler`) so serverless functions share PgBouncer connections.
 */
type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __vyhelSql?: postgres.Sql; __vyhelDb?: Db };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.");
  }
  const client =
    globalForDb.__vyhelSql ??
    postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idle_timeout: 20,
      connect_timeout: 10,
      // PgBouncer (Neon pooler) in transaction mode does not support prepared statements.
      prepare: false,
    });
  globalForDb.__vyhelSql = client;
  return drizzle(client, { schema });
}

export function getDb(): Db {
  if (!globalForDb.__vyhelDb) globalForDb.__vyhelDb = createDb();
  return globalForDb.__vyhelDb;
}

export { schema };
