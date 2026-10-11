/** Pure helpers for Resend sender checks and safe error text (unit-tested; no secrets, no addresses). */
/** Resend's shared test sender: it can only deliver to the Resend account owner's own address. */
export const RESEND_TEST_DOMAIN = "resend.dev";

export function senderDomain(from: string) {
  return from.match(/@([^\s>]+)>?\s*$/)?.[1]?.toLowerCase() ?? null;
}

/** Email addresses never go into stored errors or logs. */
export function redactEmails(s: string) {
  return s.replace(/[^\s<>()"'`,;:]+@[^\s<>()"'`,;:]+\.[a-z]{2,}/gi, "[email]");
}

export function describeResendError(status: number, data: { message?: string; name?: string }) {
  const msg = data.message ?? "";
  if (/only send testing emails|verify a domain/i.test(msg)) {
    return `Resend refused the recipient (${status}): the sender is not on a verified domain, so Resend only allows test emails to the account owner. Set EMAIL_FROM to an address on vyhel.co.in (verified in Resend).`;
  }
  if (/domain is not verified/i.test(msg)) {
    return `Resend refused the sender (${status}): the EMAIL_FROM domain is not verified in Resend.`;
  }
  return redactEmails(`Resend ${status}${data.name ? ` ${data.name}` : ""}: ${msg || "request failed"}`).slice(0, 300);
}
