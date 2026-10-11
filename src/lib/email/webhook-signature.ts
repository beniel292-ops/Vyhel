import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Resend webhook (Resend signs with Svix): HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${rawBody}`
 * keyed with the base64 part of RESEND_WEBHOOK_SECRET ("whsec_…"). The header may carry several "v1,<sig>" values.
 */
export function verifyResendWebhook(input: {
  rawBody: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}) {
  const { rawBody, id, timestamp, signature, secret } = input;
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > (input.toleranceSeconds ?? 300)) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
