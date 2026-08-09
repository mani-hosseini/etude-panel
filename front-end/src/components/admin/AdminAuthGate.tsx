"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getAdminSession,
  getServerAdminSession,
  subscribeAdminSession,
} from "@/lib/auth/admin-auth";
import { adminRoutes } from "@/lib/routes";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const session = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSession,
    getServerAdminSession,
  );
  const isLoginPage = pathname === adminRoutes.login;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!session && !isLoginPage) {
      router.replace(adminRoutes.login);
    }
    if (session && isLoginPage) {
      router.replace(adminRoutes.root);
    }
  }, [hydrated, session, isLoginPage, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef1f8]">
        <div className="flex flex-col items-center gap-3">
          <EtudeLogo size={72} />
          <p className="text-sm text-slate-500">در حال بارگذاری…</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eef1f8]">
        <div className="flex flex-col items-center gap-3">
          <EtudeLogo size={72} />
          <p className="text-sm text-slate-500">در حال انتقال به ورود…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell adminName={session.displayName}>{children}</AdminShell>
  );
}
