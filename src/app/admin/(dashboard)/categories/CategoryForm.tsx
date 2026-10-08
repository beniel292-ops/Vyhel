"use client";

import Link from "next/link";
import { AdminForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { ImageField, SlugPair } from "@/components/admin/pickers";
import type { Category } from "@/db/schema";
import { saveCategory } from "@/server/actions/categories";

export function CategoryForm({ category, media }: { category?: Category; media: { id: string; url: string; alt: string; source: string; filename: string }[] }) {
  const c = category;
  return (
    <AdminForm action={saveCategory} className="grid gap-4" resetOnSuccess={!c}>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <SlugPair nameLabel="Name" nameField="name" defaultName={c?.name} defaultSlug={c?.slug} prefix="/categories/" locked={Boolean(c)} />
      <TextArea label="Description" name="description" rows={2} defaultValue={c?.description ?? ""} />
      <ImageField urlName="image" altName="imageAlt" defaultUrl={c?.image} defaultAlt={c?.imageAlt} media={media} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="SEO title" name="seoTitle" defaultValue={c?.seoTitle ?? ""} />
        <TextField label="Sort order" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
      </div>
      <TextArea label="SEO description" name="seoDescription" rows={2} defaultValue={c?.seoDescription ?? ""} />
      <Checkbox label="Featured" name="featured" defaultChecked={c?.featured ?? true} />
      <div className="flex justify-end gap-2">
        {c ? <Link href="/admin/categories" className="self-center px-3 text-sm text-muted hover:text-ink">Cancel</Link> : null}
        <SubmitButton>{c ? "Save category" : "Create category"}</SubmitButton>
      </div>
    </AdminForm>
  );
}
