"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { SessionProvider } from "@/components/panel/SessionProvider";
import {
  getServerSession,
  getSession,
  isTeacherSession,
  sessionHome,
  subscribeSession,
} from "@/lib/auth";
import { routes } from "@/lib/routes";

export function TeacherAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      router.replace(routes.login);
      return;
    }
    if (!isTeacherSession(session)) {
      router.replace(sessionHome(session));
    }
  }, [hydrated, session, router]);

  if (!hydrated || !session || !isTeacherSession(session)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <EtudeLogo size={72} />
          <p className="text-sm text-muted-foreground">در حال بارگذاری پنل استاد…</p>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider session={session}>
      <TeacherShell teacherName={session.displayName}>{children}</TeacherShell>
    </SessionProvider>
  );
}
