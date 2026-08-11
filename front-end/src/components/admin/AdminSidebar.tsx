"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Users,
} from "lucide-react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { adminLogoutWithApi } from "@/lib/auth/admin-auth";
import { adminRoutes, isNavActive } from "@/lib/routes";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: adminRoutes.root,
    label: "صفحه اصلی",
    description: "نمای کلی سیستم",
    icon: LayoutDashboard,
  },
  {
    href: adminRoutes.courses,
    label: "دوره‌ها",
    description: "محتوا و جلسات",
    icon: BookOpen,
  },
  {
    href: adminRoutes.users,
    label: "کاربران",
    description: "هنرجو و دسترسی",
    icon: Users,
  },
] as const;

type AdminSidebarProps = {
  adminName: string;
  className?: string;
  onNavigate?: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "اد";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

export function AdminSidebar({
  adminName,
  className,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    void adminLogoutWithApi().then(() => {
      router.replace(adminRoutes.login);
    });
  };

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-l border-slate-200/80 bg-white",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,_rgba(0,71,255,0.12),_transparent_70%)]"
      />

      <div className="relative px-4 pt-5 pb-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur">
          <EtudeLogo size={42} className="rounded-xl ring-1 ring-slate-200" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-display text-sm font-bold tracking-[0.18em] text-brand">
                ETUDE
              </p>
              <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                ADMIN
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">کنترل‌پنل مدیریت</p>
          </div>
        </div>
      </div>

      <div className="relative px-4 pb-3">
        <div className="flex items-start gap-2.5 rounded-2xl border border-brand/15 bg-brand/5 px-3 py-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
            <Sparkles className="size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">مدیریت محتوا</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              دوره، جلسه و اسلاید را از یکجا کنترل کنید.
            </p>
          </div>
        </div>
      </div>

      <Separator className="mx-4 w-auto bg-slate-100" />

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          منو
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
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all",
                active
                  ? "bg-slate-900 text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.8)]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {active ? (
                <span className="absolute top-1/2 start-0 h-6 w-1 -translate-y-1/2 rounded-e-full bg-brand" />
              ) : null}
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand",
                )}
              >
                <Icon className="size-4" strokeWidth={1.85} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span
                  className={cn(
                    "block truncate text-[11px]",
                    active ? "text-white/60" : "text-slate-400",
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="relative space-y-3 border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5">
          <Avatar className="size-10 rounded-xl">
            <AvatarFallback className="rounded-xl bg-brand/10 text-brand">
              {initials(adminName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {adminName}
            </p>
            <p className="text-[11px] text-slate-500">مدیر سیستم</p>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-10 w-full justify-start rounded-xl border-slate-200 bg-white text-slate-700"
        >
          <Link href="/dashboard" onClick={onNavigate}>
            <ExternalLink className="size-4" />
            پنل هنرجویی
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={logout}
          className="h-10 w-full justify-start rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="size-4" />
          خروج از حساب
        </Button>
      </div>
    </aside>
  );
}
