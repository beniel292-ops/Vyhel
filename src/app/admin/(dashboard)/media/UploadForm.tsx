"use client";

import { AdminForm, Checkbox, Field, SubmitButton, TextField } from "@/components/admin/form";
import { uploadMedia } from "@/server/actions/media";

export function UploadForm() {
  return (
    <AdminForm action={uploadMedia} className="grid gap-4" resetOnSuccess>
      <Field label="Image" name="file" required hint="JPEG, PNG, WebP, AVIF or GIF · max 5 MB">
        {(id) => <input id={id} type="file" name="file" data-max-bytes={5 * 1024 * 1024} accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm" />}
      </Field>
      <TextField label="Alt text" name="alt" required placeholder="What the image shows" />
      <TextField label="Source / credit" name="source" required placeholder="e.g. Vyhel original photo, or licensor name" />
      <TextField label="Licence note" name="licenseNote" placeholder="Optional: licence type, expiry, restrictions" />
      <Checkbox name="authorized" label="Vyhel has the right to use this image" hint="Your own photography, properly licensed images, or approved Amazon assets. No scraped images." />
      <SubmitButton>Upload</SubmitButton>
    </AdminForm>
  );
}
