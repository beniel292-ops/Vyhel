"use client";

import { Modal } from "@/components/admin/form";
import { Button } from "@/components/ui/Button";
import type { AffiliateLink } from "@/db/schema";
import { LinkForm } from "./LinkForm";

export function AddLinkButton({ products, associateId }: { products: { id: string; name: string }[]; associateId?: string }) {
  return (
    <Modal wide title="Add affiliate link" trigger={(open) => <Button onClick={open}>Add link</Button>}>
      {(close) => <LinkForm products={products} associateId={associateId} onDone={close} />}
    </Modal>
  );
}

export function EditLinkButton({ link, products, associateId }: { link: AffiliateLink; products: { id: string; name: string }[]; associateId?: string }) {
  return (
    <Modal
      wide
      title="Edit affiliate link"
      trigger={(open) => (
        <button type="button" onClick={open} className="rounded px-2 py-1 text-[12.5px] text-ink-soft hover:bg-sunken">
          Edit
        </button>
      )}
    >
      {(close) => <LinkForm link={link} products={products} associateId={associateId} onDone={close} />}
    </Modal>
  );
}
