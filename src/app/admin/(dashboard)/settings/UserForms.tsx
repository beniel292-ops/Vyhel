"use client";

import { AdminForm, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { createUser, removeDemoData } from "@/server/actions/settings";

export function CreateUserForm() {
  return (
    <AdminForm action={createUser} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
      <TextField label="Email" name="email" type="email" required autoComplete="off" />
      <TextField label="Name" name="name" />
      <SelectField label="Role" name="role" defaultValue="editor" options={[{ value: "editor", label: "Editor — manage content" }, { value: "admin", label: "Admin — content, users & settings" }]} />
      <TextField label="Temporary password" name="password" type="text" required autoComplete="new-password" hint="12+ characters, letters and numbers. Share it privately." />
      <div className="sm:col-span-2 flex justify-end">
        <SubmitButton>Add user</SubmitButton>
      </div>
    </AdminForm>
  );
}

export function RemoveDemoForm() {
  return (
    <AdminForm action={removeDemoData} className="flex flex-wrap items-end gap-3">
      <TextField label='Type "REMOVE" to confirm' name="confirm" autoComplete="off" className="w-56" />
      <SubmitButton variant="danger">Remove development data</SubmitButton>
    </AdminForm>
  );
}
