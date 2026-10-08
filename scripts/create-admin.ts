/**
 * Create (or reset) an admin account.
 *   npm run admin:create -- you@example.com "Your Name"
 * You'll be prompted for a password (min. 12 characters, letters + numbers).
 * Non-interactive: ADMIN_PASSWORD=... npm run admin:create -- you@example.com "Your Name"
 */
import "./load-env";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

async function hash(password: string) {
  const salt = randomBytes(16);
  const h = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${h.toString("base64")}`;
}

async function main() {
  const [emailArg, nameArg, roleArg] = process.argv.slice(2);
  if (!emailArg) throw new Error('Usage: npm run admin:create -- email "Name" [admin|editor]');
  const email = emailArg.toLowerCase().trim();
  const role = roleArg === "editor" ? "editor" : "admin";
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password (min 12 chars, letters + numbers): ");
    rl.close();
  }
  if (password.length < 12 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must be at least 12 characters and include letters and numbers.");
  }
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1, prepare: false });
  const passwordHash = await hash(password);
  const [user] = await sql`
    insert into users (email, name, password_hash, role)
    values (${email}, ${nameArg ?? ""}, ${passwordHash}, ${role})
    on conflict (email) do update set password_hash = excluded.password_hash, role = excluded.role,
      name = coalesce(nullif(excluded.name, ''), users.name), disabled = false, updated_at = now()
    returning id, email, role`;
  await sql`insert into profiles (user_id, display_name) values (${user.id}, ${nameArg ?? ""}) on conflict do nothing`;
  await sql`delete from sessions where user_id = ${user.id}`;
  console.log(`✓ ${user.role} account ready: ${user.email}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
