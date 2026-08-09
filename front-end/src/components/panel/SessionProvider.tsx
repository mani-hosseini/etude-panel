"use client";

import { createContext, useContext } from "react";

import type { EtudeSession } from "@/lib/auth";

const SessionContext = createContext<EtudeSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: EtudeSession;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}

export function useStudentSession(): EtudeSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useStudentSession باید داخل SessionProvider استفاده شود");
  }
  return session;
}
