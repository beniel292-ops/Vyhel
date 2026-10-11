/**
 * Resolves the transactional email sender from EMAIL_FROM. Pure (no I/O) so it is unit-tested.
 *
 * Production (VERCEL_ENV=production) never falls back: a missing, malformed or resend.dev sender
 * returns `from: null`, and sendEmail refuses to call Resend with a clear configuration error.
 * Local/preview builds may use Resend's test sender, which only delivers to the Resend account owner.
 */
export const RESEND_TEST_SENDER = "Vyhel <onboarding@resend.dev>";
export const RESEND_TEST_DOMAIN = "resend.dev";

export type SenderStatus = "ok" | "missing" | "invalid" | "test_sender";

export type ResolvedSender = {
  /** The value to send as Resend's `from`, or null when sending must not happen. */
  from: string | null;
  domain: string | null;
  status: SenderStatus;
  production: boolean;
  /** Human-readable configuration problem (never contains secrets). Null when all is well. */
  issue: string | null;
};

const ADDRESS = /^[^\s<>@"]+@[^\s<>@"]+\.[^\s<>@".]+$/;

/** "Name <a@b.c>" or "a@b.c" → the bare address, else null. */
export function parseSenderAddress(value: string) {
  const v = value.trim();
  const angle = v.match(/^[^<>]*<\s*([^<>]+?)\s*>$/);
  const addr = angle ? angle[1] : v;
  return ADDRESS.test(addr) ? addr : null;
}

export function senderDomain(from: string) {
  const addr = parseSenderAddress(from);
  return addr ? addr.slice(addr.lastIndexOf("@") + 1).toLowerCase() : null;
}

export function resolveSender(env: { EMAIL_FROM?: string; VERCEL_ENV?: string }): ResolvedSender {
  const production = env.VERCEL_ENV === "production";
  // Tolerate a value pasted with surrounding quotes (Vercel stores them literally).
  const raw = (env.EMAIL_FROM ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();

  if (!raw) {
    return production
      ? { from: null, domain: null, status: "missing", production, issue: "EMAIL_FROM is not set for this production deployment, so no emails are sent. Add EMAIL_FROM (an address on your Resend-verified domain) to the Production environment in Vercel, then redeploy." }
      : { from: RESEND_TEST_SENDER, domain: RESEND_TEST_DOMAIN, status: "test_sender", production, issue: "EMAIL_FROM is not set; using Resend's test sender (local/preview only — it only delivers to the Resend account owner)." };
  }

  const domain = senderDomain(raw);
  if (!domain) {
    return { from: null, domain: null, status: "invalid", production, issue: 'EMAIL_FROM is not a valid sender. Use "Name <address@your-verified-domain>" or a bare address.' };
  }

  if (domain === RESEND_TEST_DOMAIN || domain.endsWith(`.${RESEND_TEST_DOMAIN}`)) {
    return production
      ? { from: null, domain, status: "test_sender", production, issue: "EMAIL_FROM is set to Resend's test sender (resend.dev), which only delivers to the Resend account owner. Emails are blocked in production until EMAIL_FROM uses your Resend-verified domain; then redeploy." }
      : { from: raw, domain, status: "test_sender", production, issue: "EMAIL_FROM uses Resend's test sender (resend.dev); it only delivers to the Resend account owner (fine for local testing)." };
  }

  return { from: raw, domain, status: "ok", production, issue: null };
}
