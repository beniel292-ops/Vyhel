"use client";

import { ArrowUpRight } from "@/components/ui/icons";
import { buttonClasses } from "@/components/ui/Button";
import { trackAffiliateClick } from "@/lib/analytics/client";
import { merchantDisplayName } from "@/lib/merchant-name";
import { cn } from "@/lib/utils";

/**
 * The only way Vyhel links to a merchant.
 * - The href IS the merchant's Special Link (no redirect or cloaking), so the destination is visible.
 * - rel="sponsored" tells search engines it's a paid link.
 * - Click is recorded with a beacon that never delays or blocks navigation.
 * - A visible "Paid link" disclosure always sits next to the button.
 */
export function AffiliateCTA({
  href,
  productId,
  linkId,
  placement,
  pageType,
  pageId,
  label,
  merchant,
  merchantLabel,
  size = "lg",
  variant = "primary",
  showDisclosure = true,
  className,
  fullWidth,
}: {
  href: string | null | undefined;
  productId: string;
  linkId?: string | null;
  placement: string;
  pageType: "product" | "guide" | "collection" | "category" | "home";
  pageId?: string | null;
  /** Used for Amazon links; other merchants always read "Buy on {merchant}". */
  label?: string;
  merchant?: string | null;
  merchantLabel?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  showDisclosure?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  const name = merchantDisplayName(merchant, merchantLabel, href);
  const text = merchant && merchant !== "amazon" ? `Buy on ${name}` : (label ?? "Buy on Amazon");
  if (!href) {
    // Never render a broken buy button.
    return <p className="text-sm text-muted">Retailer link coming soon.</p>;
  }
  return (
    <div className={cn("flex flex-col gap-2", fullWidth ? "items-stretch" : "items-start", className)}>
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener"
        className={buttonClasses(variant, size, cn(fullWidth && "w-full"))}
        onClick={() => trackAffiliateClick({ productId, linkId, placement, pageType, pageId })}
      >
        {text}
        <ArrowUpRight size={16} />
        <span className="sr-only">(opens {name} in a new tab — you buy from {name}, not Vyhel. Paid link)</span>
      </a>
      {showDisclosure ? (
        <span className="text-xs text-muted" aria-hidden="true">
          Paid link · You&rsquo;ll complete your purchase on {name}
        </span>
      ) : null}
    </div>
  );
}
