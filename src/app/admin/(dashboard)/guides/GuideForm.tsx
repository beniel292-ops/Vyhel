"use client";

import { AdminForm, Checkbox, FormSection, PublishBar, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { ImageField, MultiPicker, SlugPair } from "@/components/admin/pickers";
import type { Guide } from "@/db/schema";
import { saveGuide } from "@/server/actions/guides";
import type { PickerOptions } from "@/server/queries/admin";

const TYPES = [
  { value: "buying_guide", label: "Buying Guide" },
  { value: "comparison", label: "Comparison" },
  { value: "review", label: "Product Review" },
  { value: "problem_solver", label: "Problem Solver" },
];

export function GuideForm({
  guide,
  productIds = [],
  relatedIds = [],
  extraCategoryIds = [],
  options,
}: {
  guide?: Guide;
  productIds?: string[];
  relatedIds?: string[];
  extraCategoryIds?: string[];
  options: PickerOptions;
}) {
  const g = guide;
  const isNew = !g;
  return (
    <AdminForm action={saveGuide}>
      {g ? <input type="hidden" name="id" value={g.id} /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 gap-6">
          <FormSection title="Article">
            <SlugPair nameLabel="Title" nameField="title" defaultName={g?.title} defaultSlug={g?.slug} prefix="/guides/" locked={g?.status === "published"} />
            <TextField label="Subtitle" name="subtitle" defaultValue={g?.subtitle ?? ""} />
            <TextArea label="Excerpt / introduction" name="excerpt" rows={3} defaultValue={g?.excerpt ?? ""} hint="Shown as the lead paragraph and on guide cards." />
            <MarkdownEditor name="content" label="Content" defaultValue={g?.content} />
            <TextArea label="Conclusion (the bottom line)" name="conclusion" rows={2} defaultValue={g?.conclusion ?? ""} />
          </FormSection>
          <FormSection title="Hero image">
            <ImageField urlName="heroImage" altName="heroImageAlt" defaultUrl={g?.heroImage} defaultAlt={g?.heroImageAlt} media={options.media} />
          </FormSection>
          <FormSection title="SEO">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="SEO title" name="seoTitle" defaultValue={g?.seoTitle ?? ""} maxLength={70} />
              <TextField label="Canonical URL" name="canonicalUrl" defaultValue={g?.canonicalUrl ?? ""} />
            </div>
            <TextArea label="SEO description" name="seoDescription" rows={2} defaultValue={g?.seoDescription ?? ""} maxLength={170} />
          </FormSection>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <FormSection title="Details">
            <SelectField label="Type" name="guideType" defaultValue={g?.guideType ?? "buying_guide"} options={TYPES} />
            <SelectField label="Category" name="categoryId" placeholder="None" defaultValue={g?.categoryId ?? ""} options={options.categories.map((c) => ({ value: c.id, label: c.name }))} />
            <TextField label="Author" name="author" defaultValue={g?.author ?? "Vyhel Editorial"} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Reading time" name="readingTime" type="number" min={1} defaultValue={g?.readingTime ?? ""} hint="Auto if blank" />
              <TextField label="Published" name="publishedAt" type="date" defaultValue={g?.publishedAt ? g.publishedAt.toISOString().slice(0, 10) : ""} />
            </div>
            <Checkbox label="Featured" name="featured" defaultChecked={g?.featured} />
          </FormSection>
          <FormSection title="Related">
            <MultiPicker name="productIds" marker="__products" label="Products in this guide" options={options.products} defaultSelected={productIds} hint="Shown as recommendations with CTAs." />
            <MultiPicker name="relatedIds" marker="__related" label="Related guides" options={options.guides} defaultSelected={relatedIds} exclude={g?.id} />
            <MultiPicker name="extraCategoryIds" marker="__categories" label="Also show in categories" options={options.categories} defaultSelected={extraCategoryIds} />
          </FormSection>
        </div>
      </div>
      <PublishBar status={g?.status} isNew={isNew} cancelHref="/admin/guides">
        {!isNew && g?.status !== "archived" ? <SubmitButton intent="archive" variant="ghost">Archive</SubmitButton> : null}
        {g?.status === "published" ? <SubmitButton intent="draft" variant="ghost">Unpublish</SubmitButton> : null}
        {g?.status !== "published" && g?.status !== "review" ? <SubmitButton intent="review" variant="ghost">Send to review</SubmitButton> : null}
        <SubmitButton intent="preview" variant="secondary">Preview</SubmitButton>
        <SubmitButton intent={isNew ? "draft" : "save"} variant="secondary">Save</SubmitButton>
        <SubmitButton intent="publish">{g?.status === "published" ? "Update live page" : "Publish"}</SubmitButton>
      </PublishBar>
    </AdminForm>
  );
}
