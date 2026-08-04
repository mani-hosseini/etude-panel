"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Music2,
  UserRound,
} from "lucide-react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { copy } from "@/constants/copy";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: copy.nav.dashboard, icon: LayoutDashboard },
  { href: "/dashboard/courses", label: copy.nav.courses, icon: Music2 },
  { href: "/dashboard/schedule", label: copy.nav.schedule, icon: CalendarDays },
  { href: "/dashboard/profile", label: copy.nav.profile, icon: UserRound },
] as const;

type PanelSidebarProps = {
  studentName: string;
  className?: string;
};

export function PanelSidebar({ studentName, className }: PanelSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearSession();
    router.replace("/");
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-brand text-white",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/15 px-5 py-5">
        <EtudeLogo size={48} className="rounded-full bg-white p-0.5" />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold tracking-[0.2em]">
            {copy.brand}
          </p>
          <p className="truncate text-xs text-white/70">{copy.tagline}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-brand shadow-sm"
                  : "text-white/85 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/15 p-4">
        <div className="mb-3 rounded-xl bg-white/10 px-3 py-2.5">
          <p className="text-[11px] text-white/60">هنرجو</p>
          <p className="truncate text-sm font-semibold">{studentName}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          {copy.nav.logout}
        </button>
      </div>
    </aside>
  );
}
