"use client";

import Link from "next/link";
import { AdminForm, Checkbox, FormSection, PublishBar, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { CategoryField, FaqEditor, ImageField, MultiPicker, ScoreFields, SlugPair, SpecialLinkField } from "@/components/admin/pickers";
import type { AffiliateLink, Product } from "@/db/schema";
import { saveProduct } from "@/server/actions/products";
import type { PickerOptions } from "@/server/queries/admin";

const SECTIONS = [
  ["basics", "1. Basics"],
  ["amazon", "2. Merchant link"],
  ["editorial", "3. Editorial"],
  ["scoring", "4. Scoring"],
  ["images", "5. Images"],
  ["seo", "6. SEO"],
  ["related", "7. Related"],
  ["publishing", "8. Publishing"],
];

const BADGES = [
  { value: "editors_pick", label: "Editor's Pick" },
  { value: "best_for_students", label: "Best for Students" },
  { value: "best_for_cars", label: "Best for Cars" },
  { value: "worth_considering", label: "Worth Considering" },
];

export function ProductForm({
  product,
  link,
  collectionIds = [],
  guideIds = [],
  relatedIds = [],
  options,
  associateId,
}: {
  product?: Product;
  link?: AffiliateLink | null;
  collectionIds?: string[];
  guideIds?: string[];
  relatedIds?: string[];
  options: PickerOptions;
  associateId?: string;
}) {
  const p = product;
  const isNew = !p;
  return (
    <AdminForm action={saveProduct}>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-8 xl:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label="Form sections" className="hidden xl:block">
          <ul className="sticky top-8 space-y-1 text-[13px]">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid min-w-0 gap-6">
          <FormSection id="basics" title="Product basics">
            <SlugPair nameLabel="Name" nameField="name" defaultName={p?.name} defaultSlug={p?.slug} prefix="/products/" locked={p?.status === "published"} />
            <div className="grid gap-4 sm:grid-cols-3">
              <CategoryField categories={options.categories} defaultValue={p?.categoryId} required />
              <TextField label="Subcategory" name="subcategory" defaultValue={p?.subcategory ?? ""} placeholder="e.g. Desk accessories" />
              <TextField label="Brand" name="brand" defaultValue={p?.brand ?? ""} />
            </div>
            <TextArea label="Short description" name="shortDescription" rows={2} defaultValue={p?.shortDescription ?? ""} hint="Shown on product cards. One or two sentences." />
            <TextField
              label="Editorial statement"
              name="editorialStatement"
              defaultValue={p?.editorialStatement ?? ""}
              placeholder="A simple laptop stand that improves desk ergonomics without taking over the desk."
              hint="The one line under the product title."
            />
          </FormSection>

          <FormSection
            id="amazon"
            title="Merchant link"
            description="Where customers buy this product. Vyhel never sells affiliate products — the button sends people to the merchant. For Amazon, paste the Special Link from SiteStripe or Associates Central."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Merchant"
                name="merchant"
                defaultValue={link?.merchant ?? "amazon"}
                options={[
                  { value: "amazon", label: "Amazon" },
                  { value: "flipkart", label: "Flipkart" },
                  { value: "direct", label: "Brand's own store" },
                  { value: "other", label: "Other retailer" },
                ]}
                hint="The button reads “Buy on {merchant}”."
              />
              <TextField label="Merchant name (optional)" name="merchantLabel" defaultValue={link?.label && link.label !== "Amazon" ? link.label : ""} placeholder="e.g. Nykaa, Croma" hint="Shown on the button for non-Amazon merchants." />
            </div>
            <SpecialLinkField defaultValue={link?.specialLink} associateId={associateId} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Amazon product URL" name="amazonUrl" defaultValue={link?.amazonUrl ?? ""} placeholder="https://www.amazon.in/dp/…" hint="The plain product page, for reference." />
              <TextField label="ASIN" name="asin" defaultValue={p?.asin ?? ""} placeholder="Detected from the link if possible" spellCheck={false} />
              <TextField label="Associate tracking tag" name="associateTag" defaultValue={link?.associateTag ?? ""} placeholder={associateId || "Detected from ?tag="} hint="For your records — Vyhel won't add it to the link." />
              <TextField label="Sub-tag (optional)" name="subTag" defaultValue={link?.subTag ?? ""} />
            </div>
            {link ? (
              <p className="text-xs text-muted">
                Link status: <span className="font-medium capitalize text-ink">{link.status}</span>.{" "}
                <Link href="/admin/affiliate-links" className="underline">Verify it in Affiliate Links</Link> after testing the destination.
              </p>
            ) : null}
          </FormSection>

          <FormSection id="editorial" title="Editorial" description="Explain, don't hype. Never claim testing that didn't happen.">
            <TextArea label="The quick take" name="description" rows={4} defaultValue={p?.description ?? ""} hint="2–4 sentences: what it does, why someone might want it, who should consider it." />
            <TextArea label="Why we picked it" name="whyPicked" rows={3} defaultValue={p?.whyPicked ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextArea label="Best for" name="bestFor" rows={3} defaultValue={p?.bestFor.join("\n")} hint="One per line, e.g. Students" />
              <TextArea label="Not for" name="notFor" rows={3} defaultValue={p?.notFor.join("\n")} hint="One per line" />
            </div>
            <TextArea label="Things to know" name="thingsToKnow" rows={3} defaultValue={p?.thingsToKnow ?? ""} hint="Limitations and caveats. Essential — no product is perfect." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextArea label="Pros" name="pros" rows={4} defaultValue={p?.pros.join("\n")} hint="One per line" />
              <TextArea label="Cons" name="cons" rows={4} defaultValue={p?.cons.join("\n")} hint="One per line" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextArea label="Who should buy it" name="whoShouldBuy" rows={3} defaultValue={p?.whoShouldBuy ?? ""} />
              <TextArea label="Who should skip it" name="whoShouldSkip" rows={3} defaultValue={p?.whoShouldSkip ?? ""} />
            </div>
            <FaqEditor defaultItems={p?.faq ?? []} />
          </FormSection>

          <FormSection id="scoring" title="Scoring" description="Vyhel editorial scores (0–10). Not Amazon ratings.">
            <ScoreFields
              defaults={{
                usefulnessScore: p?.usefulnessScore ?? null,
                easeScore: p?.easeScore ?? null,
                versatilityScore: p?.versatilityScore ?? null,
                valueScore: p?.valueScore ?? null,
                designScore: p?.designScore ?? null,
                vyhelScore: p?.vyhelScore ?? null,
              }}
            />
          </FormSection>

          <FormSection id="images" title="Images">
            <ImageField urlName="imageUrl" altName="imageAlt" sourceName="imageSource" defaultUrl={p?.imageUrl} defaultAlt={p?.imageAlt} defaultSource={p?.imageSource} media={options.media} />
          </FormSection>

          <FormSection id="seo" title="SEO" description="Leave blank to use sensible defaults from the product content.">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="SEO title" name="seoTitle" defaultValue={p?.seoTitle ?? ""} maxLength={70} />
              <TextField label="Canonical URL" name="canonicalUrl" defaultValue={p?.canonicalUrl ?? ""} placeholder={`/products/${p?.slug ?? "…"}`} />
            </div>
            <TextArea label="SEO description" name="seoDescription" rows={2} defaultValue={p?.seoDescription ?? ""} maxLength={170} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="OG title" name="ogTitle" defaultValue={p?.ogTitle ?? ""} />
              <TextField label="OG image URL" name="ogImage" defaultValue={p?.ogImage ?? ""} />
            </div>
            <TextArea label="OG description" name="ogDescription" rows={2} defaultValue={p?.ogDescription ?? ""} />
          </FormSection>

          <FormSection id="related" title="Related content" description="Connect this product to the rest of Vyhel.">
            <div className="grid gap-6 md:grid-cols-3">
              <MultiPicker name="collectionIds" marker="__collections" label="Collections" options={options.collections} defaultSelected={collectionIds} />
              <MultiPicker name="guideIds" marker="__guides" label="Appears in guides" options={options.guides} defaultSelected={guideIds} />
              <MultiPicker name="relatedIds" marker="__related" label="Alternatives" options={options.products} defaultSelected={relatedIds} exclude={p?.id} hint="Shown as “Alternatives worth comparing”." />
            </div>
          </FormSection>

          <FormSection id="publishing" title="Publishing">
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Badge" name="badge" placeholder="None" defaultValue={p?.badge ?? ""} options={BADGES} />
              <div className="flex flex-col justify-end gap-3 sm:col-span-2 sm:flex-row sm:items-end sm:gap-8">
                <Checkbox label="Featured" name="featured" defaultChecked={p?.featured} hint="Prioritised on the homepage" />
                <Checkbox label="Editor's Pick" name="editorsPick" defaultChecked={p?.editorsPick} hint="Eligible for the homepage hero" />
              </div>
            </div>
            <p className="text-xs text-muted">Publishing requires: name, category, short description and an Amazon Special Link.</p>
          </FormSection>
        </div>
      </div>

      <PublishBar status={p?.status} isNew={isNew} cancelHref="/admin/products">
        {p?.status !== "archived" && !isNew ? <SubmitButton intent="archive" variant="ghost">Archive</SubmitButton> : null}
        {p?.status === "published" ? <SubmitButton intent="draft" variant="ghost">Unpublish</SubmitButton> : null}
        <SubmitButton intent="preview" variant="secondary">Preview</SubmitButton>
        <SubmitButton intent={isNew ? "draft" : "save"} variant="secondary">{isNew || p?.status !== "published" ? "Save draft" : "Save"}</SubmitButton>
        {p?.status !== "published" ? <SubmitButton intent="publish">Publish</SubmitButton> : <SubmitButton intent="publish">Update live page</SubmitButton>}
      </PublishBar>
    </AdminForm>
  );
}
