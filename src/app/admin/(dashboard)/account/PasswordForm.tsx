"use client";

import { AdminForm, SubmitButton, TextField } from "@/components/admin/form";
import { changeOwnPassword } from "@/server/actions/settings";

export function PasswordForm() {
  return (
    <AdminForm action={changeOwnPassword} className="grid max-w-md gap-4" resetOnSuccess>
      <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
      <TextField label="New password" name="newPassword" type="password" autoComplete="new-password" required hint="At least 12 characters, with letters and numbers." />
      <div><SubmitButton>Update password</SubmitButton></div>
    </AdminForm>
  );
}
