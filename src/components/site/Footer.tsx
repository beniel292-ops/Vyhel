import Link from "next/link";
import type { SiteSettings } from "@/lib/settings";
import { Wordmark } from "./Logo";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/products", label: "Products" },
      { href: "/shop", label: "Shop" },
      { href: "/guides", label: "Guides" },
      { href: "/collections", label: "Collections" },
      { href: "/categories", label: "Categories" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
      { href: "/affiliate-disclosure", label: "Affiliate Disclosure" },
      { href: "/refund-policy", label: "Refund Policy" },
      { href: "/delivery-policy", label: "Delivery Policy" },
    ],
  },
];

export function Footer({ settings }: { settings: SiteSettings }) {
  const social = [
    settings.instagramUrl ? { href: settings.instagramUrl, label: "Instagram" } : null,
    settings.youtubeUrl ? { href: settings.youtubeUrl, label: "YouTube" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="mt-24 bg-ink text-white/70 md:mt-32">
      <div className="container-page py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_2fr]">
          <div>
            <Wordmark tone="light" className="text-base" />
            <p className="display mt-5 max-w-xs text-[1.75rem] text-white">{settings.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-white/75 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Social</p>
              <ul className="mt-4 space-y-2.5">
                {social.length ? (
                  social.map((s) => (
                    <li key={s.label}>
                      <a href={s.href} target="_blank" rel="noopener" className="text-sm text-white/75 hover:text-white">
                        {s.label}
                      </a>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-white/40">Coming soon</li>
                )}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-14 rounded-lg border border-white/15 p-4 md:p-5">
          <p className="text-sm leading-relaxed text-white/85">
            <span className="font-semibold text-white">Affiliate disclosure.</span> {settings.affiliateDisclosure}{" "}
            Links marked &ldquo;Paid link&rdquo; may earn Vyhel a commission at no extra cost to you. Prices and
            availability are shown on the merchant&rsquo;s site.{" "}
            <Link href="/affiliate-disclosure" className="underline underline-offset-4 hover:text-white">
              Learn more
            </Link>
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-2 text-xs text-white/40 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.siteName}. Independent product discovery.</p>
          <p>Vyhel editorial scores are our own assessments, not merchant ratings.</p>
        </div>
      </div>
    </footer>
  );
}
