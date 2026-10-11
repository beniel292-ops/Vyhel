/** Pure helpers for Resend sender checks and safe error text (unit-tested; no secrets, no addresses). */
/** Email addresses never go into stored errors or logs. */
export function redactEmails(s: string) {
  return s.replace(/[^\s<>()"'`,;:]+@[^\s<>()"'`,;:]+\.[a-z]{2,}/gi, "[email]");
}

export function describeResendError(status: number, data: { message?: string; name?: string }) {
  const msg = data.message ?? "";
  if (/only send testing emails|verify a domain/i.test(msg)) {
    return `Resend refused the recipient (${status}): the sender is not on a verified domain, so Resend only allows test emails to the account owner. Set EMAIL_FROM to an address on your Resend-verified domain and redeploy.`;
  }
  if (/domain is not verified/i.test(msg)) {
    return `Resend refused the sender (${status}): the EMAIL_FROM domain is not verified in Resend.`;
  }
  return redactEmails(`Resend ${status}${data.name ? ` ${data.name}` : ""}: ${msg || "request failed"}`).slice(0, 300);
}
