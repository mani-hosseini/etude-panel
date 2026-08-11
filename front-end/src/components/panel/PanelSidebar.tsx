"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { copy } from "@/constants/copy";
import { useDashboardQuery } from "@/lib/api/queries";
import { resolveAvatarUrl } from "@/lib/api/http";
import { logoutWithApi } from "@/lib/auth";
import { isNavActive, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const navItems = [
  { href: routes.dashboard, label: copy.nav.dashboard, icon: LayoutDashboard },
  { href: routes.courses, label: copy.nav.courses, icon: BookOpen },
  { href: routes.schedule, label: copy.nav.schedule, icon: CalendarDays },
  { href: routes.certificates, label: copy.nav.certificates, icon: Award },
  { href: routes.profile, label: copy.nav.profile, icon: UserRound },
] as const;

type PanelSidebarProps = {
  studentName: string;
  className?: string;
  onNavigate?: () => void;
};

export function PanelSidebar({
  studentName,
  className,
  onNavigate,
}: PanelSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dashboard = useDashboardQuery();
  const avatarUrl = resolveAvatarUrl(dashboard.data?.student.avatarUrl);

  const logout = () => {
    void logoutWithApi().then(() => {
      router.replace(routes.register);
    });
  };

  return (
    <aside className={cn("flex h-full flex-col navy-gradient text-white", className)}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <EtudeLogo size={48} className="rounded-full bg-white p-0.5 shadow-sm" />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold tracking-[0.2em]">
            {copy.brand}
          </p>
          <p className="truncate text-xs text-white/65">{copy.tagline}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-1 text-[11px] font-medium tracking-wide text-white/45">
          منوی اصلی
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white text-navy shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-bold text-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={studentName}
              className="size-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-white/55">هنرجو</p>
            <p className="truncate text-sm font-semibold">{studentName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          {copy.nav.logout}
        </button>
      </div>
    </aside>
  );
}
