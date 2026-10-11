import "server-only";
import { describeResendError, redactEmails, RESEND_TEST_DOMAIN, senderDomain } from "./errors";

export { redactEmails, senderDomain };

/**
 * Transactional email through Resend's REST API (no SDK dependency).
 * Never throws: callers get { ok, id } or { ok: false, error } so a mail outage can't break payments.
 * RESEND_API_BASE exists only so automated tests can use a mock server.
 */
export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Vyhel <onboarding@resend.dev>";
  const domain = senderDomain(from);
  return {
    configured: Boolean(apiKey),
    apiKey,
    from,
    senderDomain: domain,
    /** Set when customers can't receive mail with this sender (shown to admins; never a secret). */
    senderIssue:
      !domain
        ? "EMAIL_FROM is not a valid sender address."
        : domain === RESEND_TEST_DOMAIN
          ? "EMAIL_FROM uses Resend's test sender (resend.dev), which only delivers to the Resend account owner. Customers will not receive download emails. Set EMAIL_FROM to an address on your verified domain, e.g. Vyhel <orders@vyhel.co.in>."
          : null,
    adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
    apiBase: ((process.env.VERCEL_ENV === "production" ? "" : process.env.RESEND_API_BASE?.trim()) || "https://api.resend.com").replace(/\/$/, ""),
  };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}): Promise<SendResult> {
  const cfg = emailConfig();
  if (!cfg.apiKey) return { ok: false, error: "Email is not configured (RESEND_API_KEY missing)." };
  try {
    const res = await fetch(`${cfg.apiBase}/emails`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        "content-type": "application/json",
        ...(input.idempotencyKey ? { "idempotency-key": input.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok || !data.id) return { ok: false, error: describeResendError(res.status, data) };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: redactEmails(err instanceof Error ? err.message : "Email request failed") };
  }
}
