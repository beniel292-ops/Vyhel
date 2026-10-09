"use client";

import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";
import { quickAddProduct } from "@/server/actions/products";
import { AdminForm, Modal, SubmitButton, TextArea, TextField } from "./form";
import { CategoryField, ImageField, SpecialLinkField } from "./pickers";

/** The fastest path for adding an affiliate product (target: under two minutes). */
export function QuickAddProduct({
  categories,
  media,
  associateId,
  variant = "primary",
  label = "Add Product",
}: {
  categories: { id: string; name: string }[];
  media: { id: string; url: string; alt: string; source: string; filename: string }[];
  associateId?: string;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  return (
    <Modal
      wide
      title="Add affiliate product"
      trigger={(open) => (
        <Button variant={variant} onClick={open}>
          <PlusIcon size={15} /> {label}
        </Button>
      )}
    >
      {() => (
        <AdminForm action={quickAddProduct} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Product name" name="name" required autoFocus placeholder="e.g. Adjustable Laptop Stand" />
            <CategoryField categories={categories} required />
          </div>
          <SpecialLinkField associateId={associateId} required />
          <TextArea label="Description" name="shortDescription" rows={2} placeholder="One sentence: what it does and who it's for." />
          <TextField label="Vyhel score" name="vyhelScore" type="number" min={0} max={10} step={0.1} placeholder="0–10" className="sm:max-w-[10rem]" />
          <ImageField urlName="imageUrl" altName="imageAlt" sourceName="imageSource" media={media} />
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <p className="mr-auto self-center text-xs text-muted">You can add the full editorial write-up next.</p>
            <SubmitButton intent="draft" variant="secondary">Save draft</SubmitButton>
            <SubmitButton intent="publish">Publish</SubmitButton>
          </div>
        </AdminForm>
      )}
    </Modal>
  );
}
