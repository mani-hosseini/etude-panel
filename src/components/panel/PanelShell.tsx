"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Music2,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { PanelSidebar } from "@/components/panel/PanelSidebar";
import { copy } from "@/constants/copy";
import { cn } from "@/lib/utils";

const mobileNav = [
  { href: "/dashboard", label: copy.nav.dashboard, icon: LayoutDashboard },
  { href: "/dashboard/courses", label: copy.nav.courses, icon: Music2 },
  { href: "/dashboard/schedule", label: copy.nav.schedule, icon: CalendarDays },
  { href: "/dashboard/profile", label: copy.nav.profile, icon: UserRound },
] as const;

type PanelShellProps = {
  studentName: string;
  children: React.ReactNode;
};

export function PanelShell({ studentName, children }: PanelShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const title =
    mobileNav.find((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href),
    )?.label ?? copy.nav.dashboard;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-[1440px]">
        <div className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">
          <PanelSidebar studentName={studentName} className="h-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-white lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="باز کردن منو"
              >
                <Menu className="size-5 text-brand" strokeWidth={1.75} />
              </button>
              <div className="flex items-center gap-2 lg:hidden">
                <EtudeLogo size={36} />
                <span className="font-display text-sm font-bold tracking-widest text-brand">
                  {copy.brand}
                </span>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs text-muted-foreground">پنل هنرجو</p>
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 sm:flex">
              <span className="size-1.5 rounded-full bg-brand" />
              جلسه بعدی: فردا ۱۷:۳۰
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>

          <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-border bg-white/95 px-1 py-2 backdrop-blur lg:hidden">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(86vw,280px)] flex-col bg-brand shadow-2xl">
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                aria-label="بستن"
              >
                <X className="size-5" />
              </button>
            </div>
            <PanelSidebar
              studentName={studentName}
              className="min-h-0 flex-1 border-0"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
