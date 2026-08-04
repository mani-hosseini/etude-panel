"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { EtudeLogo } from "@/components/brand/EtudeLogo";
import { PanelShell } from "@/components/panel/PanelShell";
import { getSession, type EtudeSession } from "@/lib/auth";
import { studentProfile } from "@/lib/mock-data";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<EtudeSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/");
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <EtudeLogo size={72} />
          <p className="text-sm text-muted-foreground">در حال بارگذاری پنل…</p>
        </div>
      </div>
    );
  }

  return (
    <PanelShell
      studentName={
        session.username === "student"
          ? studentProfile.fullName
          : session.displayName
      }
    >
      {children}
    </PanelShell>
  );
}
