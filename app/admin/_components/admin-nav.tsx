"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon, LayoutDashboardIcon, UsersIcon, FolderIcon, FileTextIcon, DumbbellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/actions";

interface AdminNavProps {
  profileName: string | null;
}

const navLinks = [
  { href: "/admin", label: "דשבורד", icon: LayoutDashboardIcon, exact: true },
  { href: "/admin/students", label: "תלמידים", icon: UsersIcon, exact: false },
  { href: "/admin/modules", label: "ניהול קורסים", icon: FolderIcon, exact: false },
  { href: "/admin/summaries", label: "סיכומים", icon: FileTextIcon, exact: false },
  { href: "/admin/exercises", label: "תרגולים", icon: DumbbellIcon, exact: false },
];

function NavContent({
  pathname,
  onClose,
  profileName,
}: {
  pathname: string;
  onClose?: () => void;
  profileName: string | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-sm font-bold text-foreground">
              {profileName ?? "מנהל"}
            </p>
            <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              מנהל
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="סגור תפריט"
            >
              <XIcon className="size-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4" aria-label="ניווט ראשי">
        <ul className="space-y-1">
          {navLinks.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}

        </ul>
      </nav>

      <div className="border-t border-border/50 px-3 py-4">
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full min-h-11 justify-start text-muted-foreground hover:text-foreground"
          >
            התנתקות
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminNav({ profileName }: AdminNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — inline-start (visually right in RTL) */}
      <aside className="hidden w-56 shrink-0 border-e border-border/50 bg-card md:flex md:flex-col">
        <NavContent pathname={pathname} profileName={profileName} />
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border/50 bg-card px-4 py-3 md:hidden">
        <span className="font-heading text-base font-bold text-primary">
          חגי גיליס
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="פתח תפריט"
          aria-expanded={mobileOpen}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 start-0 z-50 w-64 bg-card transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניהול"
      >
        <NavContent
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
          profileName={profileName}
        />
      </div>
    </>
  );
}
