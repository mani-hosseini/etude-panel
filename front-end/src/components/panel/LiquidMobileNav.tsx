"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileNavItems } from "@/constants/panel-nav";
import { isNavActive } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function LiquidMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="grid w-full grid-cols-4">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" strokeWidth={active ? 2 : 1.75} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
