"use client";

import { AdminForm, Checkbox, FormSection, PublishBar, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { ImageField, MultiPicker, OrderedProductPicker, SlugPair } from "@/components/admin/pickers";
import type { Collection } from "@/db/schema";
import { saveCollection } from "@/server/actions/collections";
import type { PickerOptions } from "@/server/queries/admin";

export function CollectionForm({
  collection,
  items = [],
  guideIds = [],
  options,
}: {
  collection?: Collection;
  items?: { id: string; note: string | null }[];
  guideIds?: string[];
  options: PickerOptions;
}) {
  const c = collection;
  const isNew = !c;
  return (
    <AdminForm action={saveCollection}>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 gap-6">
          <FormSection title="Collection">
            <SlugPair nameLabel="Name" nameField="name" defaultName={c?.name} defaultSlug={c?.slug} prefix="/collections/" locked={c?.status === "published"} />
            <TextField label="Tagline" name="tagline" defaultValue={c?.tagline ?? ""} placeholder="Useful products for building a better college desk." />
            <TextArea label="Short description" name="description" rows={2} defaultValue={c?.description ?? ""} hint="Used on cards and for search engines." />
            <TextArea label="Why this collection exists" name="intro" rows={5} defaultValue={c?.intro ?? ""} hint="Markdown supported." />
          </FormSection>
          <FormSection title="Products" description="Collections update automatically: only published products are shown publicly.">
            <OrderedProductPicker options={options.products} defaultItems={items} />
          </FormSection>
          <FormSection title="Hero image" description="Optional. Without one, the first three product images form the cover.">
            <ImageField urlName="heroImage" altName="heroImageAlt" defaultUrl={c?.heroImage} defaultAlt={c?.heroImageAlt} media={options.media} />
          </FormSection>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <FormSection title="Display">
            <Checkbox label="Featured on homepage" name="featured" defaultChecked={c?.featured} />
            <TextField label="Sort order" name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} hint="Lower numbers appear first." />
          </FormSection>
          <FormSection title="Related guides">
            <MultiPicker name="guideIds" marker="__guides" label="Guides" options={options.guides} defaultSelected={guideIds} />
          </FormSection>
          <FormSection title="SEO">
            <TextField label="SEO title" name="seoTitle" defaultValue={c?.seoTitle ?? ""} />
            <TextArea label="SEO description" name="seoDescription" rows={2} defaultValue={c?.seoDescription ?? ""} />
          </FormSection>
        </div>
      </div>
      <PublishBar status={c?.status} isNew={isNew} cancelHref="/admin/collections">
        {!isNew && c?.status !== "archived" ? <SubmitButton intent="archive" variant="ghost">Archive</SubmitButton> : null}
        {c?.status === "published" ? <SubmitButton intent="draft" variant="ghost">Unpublish</SubmitButton> : null}
        <SubmitButton intent="preview" variant="secondary">Preview</SubmitButton>
        <SubmitButton intent={isNew ? "draft" : "save"} variant="secondary">Save</SubmitButton>
        <SubmitButton intent="publish">{c?.status === "published" ? "Update live page" : "Publish"}</SubmitButton>
      </PublishBar>
    </AdminForm>
  );
}
