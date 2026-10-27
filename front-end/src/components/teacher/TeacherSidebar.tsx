"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { teacherNavItems } from "@/constants/teacher-nav";
import { useStudioProfileQuery } from "@/lib/api/studio-queries";
import { logoutWithApi } from "@/lib/auth";
import { isNavActive, routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type TeacherSidebarProps = {
  teacherName: string;
  className?: string;
  onNavigate?: () => void;
};

export function TeacherSidebar({
  teacherName,
  className,
  onNavigate,
}: TeacherSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const profileQuery = useStudioProfileQuery();
  const title = profileQuery.data?.title || "استاد";

  const logout = () => {
    void logoutWithApi().then(() => {
      router.replace(routes.login);
    });
  };

  return (
    <aside className={cn("flex h-full flex-col navy-gradient text-white", className)}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <EtudeLogo size={48} className="rounded-full bg-white p-0.5 shadow-sm" />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold tracking-[0.2em]">ETUDE</p>
          <p className="truncate text-xs text-white/65">پنل اساتید آکادمی اتود</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-1 text-[11px] font-medium tracking-wide text-white/45">
          استودیو
        </p>
        {teacherNavItems.map((item) => {
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
        <div className="mb-3 rounded-2xl bg-white px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand">
              {teacherName.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">{title}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-navy">
                {teacherName}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          خروج
        </button>
      </div>
    </aside>
  );
}
