import "server-only";
import { describeResendError, redactEmails } from "./errors";
import { resolveSender, senderDomain } from "./sender";

export { redactEmails, senderDomain };

/**
 * Transactional email through Resend's REST API (no SDK dependency).
 * Never throws: callers get { ok, id } or { ok: false, error } so a mail outage can't break payments.
 * RESEND_API_BASE exists only so automated tests can use a mock server.
 */
export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = resolveSender({ EMAIL_FROM: process.env.EMAIL_FROM, VERCEL_ENV: process.env.VERCEL_ENV });
  return {
    configured: Boolean(apiKey),
    apiKey,
    /** Null when sending must not happen (e.g. production without a verified-domain sender). */
    from: sender.from,
    senderDomain: sender.domain,
    senderStatus: sender.status,
    /** Shown to admins; never contains secrets. */
    senderIssue: sender.issue,
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
  if (!cfg.from) return { ok: false, error: `Email sender misconfigured: ${cfg.senderIssue ?? "EMAIL_FROM is invalid."}` };
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
