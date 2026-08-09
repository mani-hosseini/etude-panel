"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { PanelShell } from "@/components/panel/PanelShell";
import { SessionProvider } from "@/components/panel/SessionProvider";
import {
  getServerSession,
  getSession,
  subscribeSession,
} from "@/lib/auth";
import { routes } from "@/lib/routes";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    getServerSession,
  );
  const isSlidePlay = pathname.includes("/play");

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      router.replace(routes.register);
    }
  }, [hydrated, session, router]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <EtudeLogo size={72} />
          <p className="text-sm text-muted-foreground">در حال بارگذاری پنل…</p>
        </div>
      </div>
    );
  }

  if (isSlidePlay) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
  }

  return (
    <SessionProvider session={session}>
      <PanelShell studentName={session.displayName}>{children}</PanelShell>
    </SessionProvider>
  );
}
