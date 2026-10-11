import { json } from "@/lib/http";
import { verifyResendWebhook } from "@/lib/email/webhook-signature";
import { applyEmailEvent } from "@/server/services/digital-orders";

/**
 * Resend webhook (Resend → Webhooks). Subscribe to: email.delivered, email.bounced, email.failed,
 * email.complained, email.delivery_delayed. Verified with RESEND_WEBHOOK_SECRET against the raw body.
 * Only customer download emails are tracked (matched by Resend message id); a bounce marks delivery
 * failed so the admin can fix the address and resend — payment state is never touched.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return json({ error: "Webhook not configured" }, 503);
  const raw = await req.text();
  const ok = verifyResendWebhook({
    rawBody: raw,
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
    secret,
  });
  if (!ok) return json({ error: "Invalid signature" }, 401);
  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!event.type || !event.data?.email_id) return json({ ok: true, ignored: true });
  const r = await applyEmailEvent(event.data.email_id, event.type);
  return json({ ok: true, ...r });
}
