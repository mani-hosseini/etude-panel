"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { subscribeSaved } from "@/lib/save-feedback";

export function SaveToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeSaved(setMessage), []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 4200);
    return () => window.clearTimeout(id);
  }, [message]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center px-4">
      <p
        role="status"
        className="pointer-events-auto flex max-w-lg items-center gap-2 rounded-2xl bg-navy px-4 py-3 text-sm font-medium text-white shadow-lift ring-1 ring-white/15"
      >
        <Check className="size-4 shrink-0 text-brand-300" strokeWidth={2.4} />
        <span>{message}</span>
      </p>
    </div>
  );
}
