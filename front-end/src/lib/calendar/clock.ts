import type { CalendarNow } from "@/lib/calendar/types";

export function projectedEpoch(
  syncEpochMs: number,
  monoAtSync: number,
  monoNow: number,
) {
  return syncEpochMs + (monoNow - monoAtSync);
}

export function tehranPartsFromEpoch(epochMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  let hour = pick("hour");
  if (hour === "24") hour = "00";
  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    time: `${hour}:${pick("minute")}:${pick("second")}`,
  };
}

export function reduceClockSync(
  previous: { snapshot: CalendarNow | null; stale: boolean },
  next: { ok: true; snapshot: CalendarNow } | { ok: false },
) {
  if (next.ok) return { snapshot: next.snapshot, stale: false };
  if (previous.snapshot) return { snapshot: previous.snapshot, stale: true };
  return { snapshot: null, stale: true };
}
