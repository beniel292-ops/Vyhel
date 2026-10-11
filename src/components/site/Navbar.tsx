"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { openSearch } from "./SearchDialog";

const NAV = [
  { href: "/products", label: "Discover" },
  { href: "/guides", label: "Guides" },
  { href: "/collections", label: "Collections" },
  { href: "/categories", label: "Categories" },
  { href: "/shop", label: "Shop" },
];

/** Razorpay review mode (docs/razorpay-review-mode.md): only the digital-products business is linked. */
const REVIEW_NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ reviewMode = false }: { reviewMode?: boolean }) {
  const nav = reviewMode ? REVIEW_NAV : NAV;
  const pathname = usePathname();
  // Menu is "open for this path" — navigating anywhere closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/80">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="container-page flex h-14 items-center gap-6 md:h-16 lg:gap-8">
        <Logo />
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-5 lg:gap-7">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "relative py-2 text-[13.5px] transition-colors",
                    isActive(item.href)
                      ? "text-ink after:absolute after:inset-x-0 after:-bottom-[13px] after:h-px after:bg-accent md:after:-bottom-[17px]"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {reviewMode ? null : (
            <>
              <button
                type="button"
                onClick={openSearch}
                className="hidden h-9 w-40 shrink-0 items-center gap-2 lg:w-60 rounded-md border border-line bg-surface/70 px-3 text-left text-[13px] text-faint transition-colors hover:border-ink/30 md:flex"
              >
                <SearchIcon size={15} className="text-muted" />
                <span className="flex-1 truncate">Search Vyhel</span>
                <kbd className="hidden rounded border lg:inline border-line px-1.5 font-sans text-[11px] text-muted">{mac ? "⌘" : "Ctrl"} K</kbd>
              </button>
              <button
                type="button"
                onClick={openSearch}
                aria-label="Search"
                className="flex size-11 items-center justify-center rounded-md text-ink hover:bg-sunken md:hidden"
              >
                <SearchIcon size={20} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="-mr-2 flex size-11 items-center justify-center rounded-md text-ink hover:bg-sunken md:hidden"
          >
            {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-menu" aria-label="Mobile" className="animate-fade-up border-t border-line bg-canvas md:hidden">
          <ul className="container-page py-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between border-b border-line-soft py-3.5 text-[15px] last:border-0",
                    isActive(item.href) ? "font-medium text-ink" : "text-ink-soft",
                  )}
                >
                  {item.label}
                  {isActive(item.href) ? <span className="size-1.5 rounded-full bg-accent" /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
