"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/site/Logo";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; adminOnly?: boolean };
const NAV: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard" }] },
  {
    title: "Products",
    items: [
      { href: "/admin/digital-products", label: "Digital Products" },
      { href: "/admin/products", label: "Affiliate Products" },
    ],
  },
  { title: "Orders", items: [{ href: "/admin/orders", label: "Digital Orders" }] },
  {
    title: "Content",
    items: [
      { href: "/admin/guides", label: "Guides" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/affiliate-links", label: "Affiliate Links" },
      { href: "/admin/media", label: "Media" },
    ],
  },
  { title: "Insights", items: [{ href: "/admin/analytics", label: "Analytics" }] },
  { items: [{ href: "/admin/settings", label: "Settings", adminOnly: true }] },
];

export function AdminSidebar({ user }: { user: { name: string; email: string; role: string } }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col">
      <div className="space-y-4 overflow-y-auto pb-4">
        {NAV.map((group, gi) => {
          const items = group.items.filter((n) => !n.adminOnly || user.role === "admin");
          if (!items.length) return null;
          return (
            <div key={gi}>
              {group.title ? <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">{group.title}</p> : null}
              <ul className="space-y-0.5">
                {items.map((n) => (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active(n.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center rounded-md px-3 py-1.5 text-[13.5px] transition-colors",
                        active(n.href) ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-soft hover:bg-surface/60 hover:text-ink",
                      )}
                    >
                      {active(n.href) ? <span className="mr-2 size-1.5 rounded-full bg-accent" /> : <span className="mr-2 size-1.5" />}
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-auto border-t border-line pt-4">
        <p className="truncate px-3 text-[13px] font-medium text-ink">{user.name || user.email}</p>
        <p className="truncate px-3 text-xs capitalize text-muted">{user.role}</p>
        <div className="mt-3 flex items-center gap-1 px-1">
          <Link href="/" target="_blank" className="rounded-md px-2 py-1.5 text-[13px] text-ink-soft hover:bg-surface">
            View site ↗
          </Link>
          <Link href="/admin/account" className="rounded-md px-2 py-1.5 text-[13px] text-ink-soft hover:bg-surface">
            Account
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="rounded-md px-2 py-1.5 text-[13px] text-ink-soft hover:bg-surface">
              Logout
            </button>
          </form>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-sunken/50 px-3 py-5 lg:flex">
        <Link href="/admin" className="mb-8 px-3">
          <Wordmark className="text-[13px]" /> <span className="ml-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Admin</span>
        </Link>
        {nav}
      </aside>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas px-4 lg:hidden">
        <Link href="/admin">
          <Wordmark className="text-[13px]" /> <span className="ml-1 text-[11px] uppercase tracking-[0.12em] text-muted">Admin</span>
        </Link>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu" className="flex size-10 items-center justify-center rounded-md hover:bg-sunken">
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
      {open ? <div className="fixed inset-x-0 top-14 z-30 flex max-h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto border-b border-line bg-canvas p-3 shadow-lg lg:hidden">{nav}</div> : null}
    </>
  );
}
