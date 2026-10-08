import "server-only";
import { emailConfig, sendEmail } from "./email/resend";
import { adminSaleEmail } from "./email/templates";

/**
 * Admin notifications. Email (Resend → ADMIN_EMAIL) is the only channel implemented today.
 * To add WhatsApp (e.g. the WhatsApp Cloud API) later, implement `NotificationChannel` and add it
 * to `channels()` — nothing in the payment flow needs to change.
 */
export type SaleNotification = {
  productName: string;
  customerEmail: string;
  amount: string;
  orderId: string;
  paymentId: string | null;
  paymentStatus: string;
  deliveryStatus: string;
  deliveryError: string | null;
  adminUrl: string;
};

export interface NotificationChannel {
  name: string;
  enabled(): boolean;
  sale(n: SaleNotification): Promise<{ ok: boolean; error?: string }>;
}

const adminEmailChannel: NotificationChannel = {
  name: "email",
  enabled: () => Boolean(emailConfig().configured && emailConfig().adminEmail),
  async sale(n) {
    const to = emailConfig().adminEmail!;
    const mail = adminSaleEmail(n);
    const r = await sendEmail({ to, ...mail, idempotencyKey: `admin-sale-${n.orderId}`, tags: [{ name: "type", value: "admin_sale" }] });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  },
};

function channels(): NotificationChannel[] {
  return [adminEmailChannel];
}

/** Fire every enabled channel; failures are logged, never thrown. */
export async function notifyAdminOfSale(n: SaleNotification) {
  await Promise.all(
    channels()
      .filter((c) => c.enabled())
      .map(async (c) => {
        try {
          const r = await c.sale(n);
          if (!r.ok) console.warn(`[notify:${c.name}]`, r.error);
        } catch (err) {
          console.warn(`[notify:${c.name}]`, err);
        }
      }),
  );
}
