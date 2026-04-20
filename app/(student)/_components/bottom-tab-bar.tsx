"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BookOpenIcon, DumbbellIcon, FileTextIcon } from "lucide-react";
import type { ComponentType } from "react";

interface Props {
  denied: string[];
}

type TabItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  page: string | null;
  exact?: boolean;
};

const tabs: TabItem[] = [
  { href: "/",          label: "בית",      icon: HomeIcon,      page: null,        exact: true },
  { href: "/lessons",   label: "שיעורים",  icon: BookOpenIcon,  page: "lessons"              },
  { href: "/exercises", label: "תרגולים",  icon: DumbbellIcon,  page: "exercises"            },
  { href: "/summaries", label: "סיכומים",  icon: FileTextIcon,  page: "summaries"            },
];

export function BottomTabBar({ denied }: Props) {
  const pathname = usePathname();
  const deniedSet = new Set(denied);
  const visibleTabs = tabs.filter((t) => t.page === null || !deniedSet.has(t.page));

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-sm pb-safe-area md:hidden"
      aria-label="ניווט ראשי"
    >
      <div className="flex items-stretch">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors min-h-14 ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-0 start-1/4 end-1/4 h-0.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              <Icon className="size-5" aria-hidden={true} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
