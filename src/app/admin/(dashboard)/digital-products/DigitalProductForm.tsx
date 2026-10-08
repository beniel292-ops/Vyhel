"use client";

import { AdminForm, Checkbox, FormSection, PublishBar, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { DigitalFileField } from "@/components/admin/DigitalFileField";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { ImageField, SlugPair } from "@/components/admin/pickers";
import type { DigitalProduct } from "@/db/schema";
import { minorToRupeesInput } from "@/lib/money";
import { saveDigitalProduct } from "@/server/actions/digital";

export function DigitalProductForm({
  product,
  file,
  media,
  driver,
  paymentsReady,
}: {
  product?: DigitalProduct;
  file: { id: string; filename: string; sizeBytes: number } | null;
  media: { id: string; url: string; alt: string; source: string; filename: string }[];
  driver: "database" | "s3";
  paymentsReady: boolean;
}) {
  const p = product;
  const isNew = !p;
  return (
    <AdminForm action={saveDigitalProduct}>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid min-w-0 gap-6">
          <FormSection title="Product" description="Sold directly by Vyhel. Customers pay through Razorpay and get the file by email.">
            <SlugPair nameLabel="Name" nameField="name" defaultName={p?.name} defaultSlug={p?.slug} prefix="/shop/" locked={p?.status === "active"} />
            <TextArea label="Short description" name="shortDescription" rows={2} defaultValue={p?.shortDescription ?? ""} hint="Shown on the product card and at the top of the product page." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Price (₹)"
                name="price"
                required
                inputMode="decimal"
                defaultValue={p ? minorToRupeesInput(p.priceMinor) : ""}
                placeholder="499"
                hint="INR, inclusive of any taxes. Customers can't change this — checkout always uses this price."
              />
              <TextField label="Checkout description" name="checkoutDescription" defaultValue={p?.checkoutDescription ?? ""} placeholder="Shown in the Razorpay window" maxLength={255} />
            </div>
            <TextArea label="What's included" name="whatsIncluded" rows={4} defaultValue={p?.whatsIncluded.join("\n")} hint="One item per line, e.g. “42-page PDF guide”." />
          </FormSection>

          <FormSection title="Deliverable file" description="The file customers receive after paying. Required before the product can go live.">
            <DigitalFileField defaultFile={file} driver={driver} />
          </FormSection>

          <FormSection title="Description">
            <MarkdownEditor name="description" label="Full description" defaultValue={p?.description} rows={14} />
          </FormSection>

          <FormSection title="Image">
            <ImageField urlName="imageUrl" altName="imageAlt" defaultUrl={p?.imageUrl} defaultAlt={p?.imageAlt} media={media} />
          </FormSection>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <FormSection title="Selling">
            <p className="text-sm text-ink-soft">
              Status: <span className="font-medium capitalize text-ink">{p?.status ?? "draft"}</span>
            </p>
            {!paymentsReady ? (
              <p className="rounded-md bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                Razorpay isn&rsquo;t configured yet (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Customers will see the product but checkout will be unavailable.
              </p>
            ) : null}
            <Checkbox label="Feature in the shop" name="featured" defaultChecked={p?.featured} />
            <TextField label="Sort order" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} hint="Lower appears first." />
          </FormSection>
        </div>
      </div>
      <PublishBar status={p?.status} isNew={isNew} cancelHref="/admin/digital-products">
        {!isNew && p?.status !== "archived" ? <SubmitButton intent="archive" variant="ghost">Archive</SubmitButton> : null}
        {p?.status === "active" ? <SubmitButton intent="deactivate" variant="ghost">Deactivate</SubmitButton> : null}
        <SubmitButton intent="save" variant="secondary">{isNew ? "Save draft" : "Save"}</SubmitButton>
        {p?.status !== "active" ? <SubmitButton intent="activate">Activate &amp; sell</SubmitButton> : <SubmitButton intent="activate">Save live product</SubmitButton>}
      </PublishBar>
    </AdminForm>
  );
}
