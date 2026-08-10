"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Menu, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { adminRoutes, isNavActive } from "@/lib/routes";
import { cn } from "@/lib/utils";

const mobileNav = [
  { href: adminRoutes.root, label: "پیشخوان", icon: LayoutDashboard },
  { href: adminRoutes.courses, label: "دوره‌ها", icon: BookOpen },
  { href: adminRoutes.users, label: "کاربران", icon: Users },
] as const;

function resolveTitle(pathname: string) {
  if (pathname.startsWith(adminRoutes.courses)) {
    if (pathname.includes("/sessions/")) return "محتوای جلسه";
    if (pathname.endsWith("/new")) return "دوره جدید";
    if (pathname !== adminRoutes.courses) return "جزئیات دوره";
    return "دوره‌ها";
  }
  return (
    mobileNav.find((item) => isNavActive(pathname, item.href))?.label ??
    "پیشخوان"
  );
}

type AdminShellProps = {
  adminName: string;
  children: React.ReactNode;
};

export function AdminShell({ adminName, children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pathForMenu, setPathForMenu] = useState(pathname);

  if (pathname !== pathForMenu) {
    setPathForMenu(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const title = resolveTitle(pathname);

  return (
    <div dir="rtl" className="min-h-dvh bg-[#eef1f8] text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-360 flex-row">
        <div className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block xl:w-72">
          <AdminSidebar adminName={adminName} className="h-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="باز کردن منو"
                >
                  <Menu className="size-5" strokeWidth={1.75} />
                </button>
                <div className="flex min-w-0 items-center gap-2 lg:hidden">
                  <EtudeLogo size={34} />
                  <div className="min-w-0">
                    <p className="font-display text-xs font-bold tracking-[0.18em] text-brand">
                      ETUDE
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{title}</p>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-medium text-slate-400">
                    پنل مدیریت
                  </p>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    {title}
                  </h1>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand sm:flex">
                <span className="size-1.5 rounded-full bg-brand" />
                آنلاین
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-5 pb-24 text-right sm:px-5 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
            {children}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-3 gap-1">
              {mobileNav.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors",
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[min(18rem,85vw)] shadow-2xl">
            <AdminSidebar
              adminName={adminName}
              className="h-full"
              onNavigate={() => setOpen(false)}
            />
            <button
              type="button"
              className="absolute left-3 top-3 inline-flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
              onClick={() => setOpen(false)}
              aria-label="بستن"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
