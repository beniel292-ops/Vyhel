"use client";

import { AdminForm, SubmitButton, TextField } from "@/components/admin/form";
import { resendOrderEmail } from "@/server/actions/digital";

/** Resend the download email (new private link). Optionally correct the customer's address first. */
export function ResendForm({ orderId, email, compact }: { orderId: string; email: string; compact?: boolean }) {
  if (compact) {
    return (
      <AdminForm action={resendOrderEmail} className="inline">
        <input type="hidden" name="id" value={orderId} />
        <SubmitButton variant="ghost" size="sm" className="!h-auto !px-2 !py-1 !text-[12.5px]">
          Resend email
        </SubmitButton>
      </AdminForm>
    );
  }
  return (
    <AdminForm action={resendOrderEmail} className="grid gap-3">
      <input type="hidden" name="id" value={orderId} />
      <TextField
        label="Send to"
        name="email"
        type="email"
        defaultValue={email}
        hint="Change this only if the customer gave a wrong address — older links will stop working."
      />
      <div>
        <SubmitButton>Resend download email</SubmitButton>
      </div>
    </AdminForm>
  );
}
