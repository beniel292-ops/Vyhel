/** Shape + defaults for site settings. Safe to import from client components. */
export type ProblemCard = { title: string; description: string; href: string };

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  instagramUrl: string;
  youtubeUrl: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  defaultOgImage: string;
  affiliateDisclosure: string;
  amazonAssociateId: string;
  amazonMarketplace: string;
  defaultCtaText: string;
  googleAnalyticsId: string;
  searchConsoleVerification: string;
  problems: ProblemCard[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Vyhel",
  tagline: "Smart finds. Better buying decisions.",
  description:
    "Vyhel helps you discover useful products, understand what they're actually good for, and decide what is worth considering.",
  contactEmail: "",
  instagramUrl: "",
  youtubeUrl: "",
  seoDefaultTitle: "Vyhel — Smart finds. Better buying decisions.",
  seoDefaultDescription:
    "Independent product discovery. Vyhel explains what products are actually good for, who should buy them, and who should skip them.",
  defaultOgImage: "",
  affiliateDisclosure: "As an Amazon Associate I earn from qualifying purchases.",
  amazonAssociateId: "",
  amazonMarketplace: "amazon.in",
  defaultCtaText: "Buy on Amazon",
  googleAnalyticsId: "",
  searchConsoleVerification: "",
  problems: [
    {
      title: "Laptop getting hot?",
      description: "Explore useful cooling and desk accessories",
      href: "/collections/better-desk",
    },
    {
      title: "Messy desk?",
      description: "Explore organization products",
      href: "/collections/better-desk",
    },
    {
      title: "Car needs a cleanup?",
      description: "Explore practical car-care products",
      href: "/collections/first-car-essentials",
    },
    {
      title: "Building a study setup?",
      description: "Explore college essentials",
      href: "/collections/student-setup",
    },
  ],
};
