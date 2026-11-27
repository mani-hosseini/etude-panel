"use client";

import { useEffect, useState } from "react";

import { calendarApi } from "@/lib/api/calendar";
import { projectedEpoch, tehranPartsFromEpoch } from "@/lib/calendar/clock";
import { buildLocalNow } from "@/lib/calendar/local";
import type { CalendarAudience, CalendarNow } from "@/lib/calendar/types";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

type IranClockProps = {
  audience: CalendarAudience;
  className?: string;
};

export function IranClock({ audience, className }: IranClockProps) {
  const [snapshot, setSnapshot] = useState<CalendarNow | null>(null);
  const [stale, setStale] = useState(false);
  const [sync, setSync] = useState<{ epochMs: number; mono: number } | null>(
    null,
  );
  const [tick, setTick] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const next = await calendarApi.now(audience);
        if (cancelled) return;
        setSnapshot(next);
        setStale(false);
        setSync({ epochMs: next.epochMs, mono: performance.now() });
      } catch {
        if (cancelled) return;
        setSnapshot((current) => {
          if (current) {
            setStale(true);
            return current;
          }
          const epoch = Date.now();
          setStale(false);
          setSync({ epochMs: epoch, mono: performance.now() });
          return buildLocalNow(epoch);
        });
      }
    };
    void pull();
    const resync = window.setInterval(() => void pull(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [audience]);

  useEffect(() => {
    if (!sync) return;
    const paint = () => {
      const epoch = projectedEpoch(sync.epochMs, sync.mono, performance.now());
      const parts = tehranPartsFromEpoch(epoch);
      setTick(parts.time);
      if (snapshot && parts.date !== snapshot.gregorian.text) {
        void calendarApi.now(audience).then((next) => {
          setSnapshot(next);
          setStale(false);
          setSync({ epochMs: next.epochMs, mono: performance.now() });
        }).catch(() => setStale(true));
      }
    };
    paint();
    const timer = window.setInterval(paint, 1000);
    return () => window.clearInterval(timer);
  }, [sync, snapshot, audience]);

  if (!snapshot || !tick) return null;

  const holiday = snapshot.isHoliday;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs",
        holiday
          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
          : "bg-brand/5 text-brand ring-1 ring-brand/15",
        className,
      )}
      title={stale ? "آخرین ساعت همگام‌شده؛ اتصال لحظه‌ای قطع است" : "ساعت تهران"}
    >
      <span className="font-sans text-sm font-bold tabular-nums tracking-wide">
        {toFa(tick)}
      </span>
      <span className="hidden font-sans font-medium sm:inline">
        {snapshot.weekdayName} {toFa(snapshot.jalali.day)}{" "}
        {snapshot.jalali.monthName}
      </span>
      {holiday ? <span className="font-semibold">تعطیل</span> : null}
    </div>
  );
}
