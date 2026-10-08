"use client";

import { AdminForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { SpecialLinkField } from "@/components/admin/pickers";
import type { AffiliateLink } from "@/db/schema";
import { saveAffiliateLink } from "@/server/actions/affiliate";

export function LinkForm({ link, products, associateId, onDone }: { link?: AffiliateLink; products: { id: string; name: string }[]; associateId?: string; onDone?: () => void }) {
  return (
    <AdminForm action={saveAffiliateLink} className="grid gap-4" onSuccess={() => onDone?.()}>
      {link ? <input type="hidden" name="id" value={link.id} /> : null}
      <SelectField label="Product" name="productId" required placeholder="Choose a product…" defaultValue={link?.productId ?? ""} options={products.map((p) => ({ value: p.id, label: p.name }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Merchant"
          name="merchant"
          defaultValue={link?.merchant ?? "amazon"}
          options={[
            { value: "amazon", label: "Amazon" },
            { value: "direct", label: "Direct brand" },
            { value: "other", label: "Other network" },
          ]}
        />
        <TextField label="Label" name="label" defaultValue={link?.label ?? ""} placeholder="e.g. Amazon.in" />
      </div>
      <SpecialLinkField defaultValue={link?.specialLink} associateId={associateId} required />
      <TextField label="Amazon product URL" name="amazonUrl" defaultValue={link?.amazonUrl ?? ""} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="ASIN" name="asin" defaultValue={link?.asin ?? ""} />
        <TextField label="Associate tag" name="associateTag" defaultValue={link?.associateTag ?? ""} placeholder={associateId} />
        <TextField label="Sub-tag" name="subTag" defaultValue={link?.subTag ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Status"
          name="status"
          defaultValue={link?.status ?? "unverified"}
          options={[
            { value: "unverified", label: "Unverified" },
            { value: "verified", label: "Verified — destination tested" },
            { value: "broken", label: "Broken" },
          ]}
        />
        <div className="flex flex-col justify-end gap-2">
          <Checkbox label="Primary link for this product" name="isPrimary" defaultChecked={link?.isPrimary ?? true} />
          <Checkbox label="Sponsored placement" name="isSponsored" defaultChecked={link?.isSponsored} />
        </div>
      </div>
      <TextArea label="Notes" name="notes" rows={2} defaultValue={link?.notes ?? ""} />
      <div className="flex justify-end">
        <SubmitButton>{link ? "Save link" : "Add link"}</SubmitButton>
      </div>
    </AdminForm>
  );
}
