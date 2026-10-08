import "server-only";

/**
 * Transactional email through Resend's REST API (no SDK dependency).
 * Never throws: callers get { ok, id } or { ok: false, error } so a mail outage can't break payments.
 * RESEND_API_BASE exists only so automated tests can use a mock server.
 */
export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Vyhel <onboarding@resend.dev>";
  return {
    configured: Boolean(apiKey),
    apiKey,
    from,
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
    if (!res.ok || !data.id) return { ok: false, error: data.message || `Resend responded ${res.status}` };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email request failed" };
  }
}
