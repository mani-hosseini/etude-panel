"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { teacherNavItems } from "@/constants/teacher-nav";
import { copy } from "@/constants/copy";
import { toFa } from "@/lib/format";
import { useStudioOverviewQuery } from "@/lib/api/studio-queries";
import { isNavActive } from "@/lib/routes";
import { cn } from "@/lib/utils";

type TeacherShellProps = {
  teacherName: string;
  children: React.ReactNode;
};

export function TeacherShell({ teacherName, children }: TeacherShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pathForMenu, setPathForMenu] = useState(pathname);
  const overview = useStudioOverviewQuery();
  const nextClass = overview.data?.nextClass ?? null;
  const nextCount =
    overview.data?.students.filter((item) => {
      if (!nextClass) return false;
      if (item.classId !== nextClass.id) return false;
      if (item.classDays && item.classDays.length > 0) {
        return item.classDays.includes(nextClass.day);
      }
      return true;
    }).length ?? 0;

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

  const title =
    teacherNavItems.find((item) => isNavActive(pathname, item.href))?.label ??
    "صفحه اصلی";

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-360">
        <div className="sticky top-0 hidden h-dvh w-68 shrink-0 lg:block xl:w-72">
          <TeacherSidebar teacherName={teacherName} className="h-full" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/80 bg-white/85 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-white text-navy shadow-sm lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="باز کردن منو"
                >
                  <Menu className="size-5" strokeWidth={1.75} />
                </button>
                <div className="flex min-w-0 items-center gap-2 lg:hidden">
                  <EtudeLogo size={34} />
                  <div className="min-w-0">
                    <p className="font-display text-xs font-bold tracking-[0.18em] text-brand">
                      {copy.brand}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {title}
                    </p>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs text-muted-foreground">پنل استاد</p>
                  <h1 className="text-lg font-bold text-navy">{title}</h1>
                </div>
              </div>
              <div className="hidden max-w-[min(100%,22rem)] items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 sm:flex">
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand" />
                <span className="truncate">
                  {nextClass
                    ? `کلاس بعد: ${nextClass.day} ${toFa(nextClass.start)} · ${toFa(nextCount)} هنرجو`
                    : "دوره‌ای واگذار نشده"}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-5 pb-24 sm:px-5 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
            {children}
          </main>

          <footer className="hidden border-t border-border/70 px-8 py-4 text-center text-xs text-muted-foreground lg:block">
            {copy.copyright}
          </footer>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
            <div className="grid w-full grid-cols-4">
              {teacherNavItems.map((item) => {
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
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(88vw,300px)] flex-col overflow-hidden shadow-2xl">
            <div className="absolute left-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white/10 p-2 text-white/90 ring-1 ring-white/15 backdrop-blur"
                aria-label="بستن"
              >
                <X className="size-5" />
              </button>
            </div>
            <TeacherSidebar
              teacherName={teacherName}
              className="min-h-0 flex-1"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
