import "server-only";

/**
 * Merchant data abstraction.
 *
 * Today Vyhel uses manually verified Amazon Special Links and shows NO prices, availability or
 * ratings. If an Amazon-approved product data API is enabled for the account later, implement a
 * provider here (server-side only) and render its data exactly as Amazon's licence requires —
 * including any timestamps/disclaimers and cache limits. Never scrape Amazon pages.
 */
export type MerchantOffer = {
  /** Display string exactly as provided by the merchant API, e.g. "₹1,299.00". */
  price: string;
  availability?: string;
  /** When the data was retrieved — required to show "Price as of …" disclaimers. */
  retrievedAt: Date;
  /** Data must not be shown after this time. */
  expiresAt: Date;
};

export interface MerchantDataProvider {
  readonly name: string;
  getOffer(input: { asin?: string | null; url?: string | null }): Promise<MerchantOffer | null>;
}

/** Default provider: no live data. The UI then says "Check current price on Amazon". */
export const manualProvider: MerchantDataProvider = {
  name: "manual",
  async getOffer() {
    return null;
  },
};

export function getMerchantProvider(): MerchantDataProvider {
  // Swap in an approved API provider here once credentials and terms allow it.
  return manualProvider;
}
