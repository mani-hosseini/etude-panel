"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { calendarApi } from "@/lib/api/calendar";
import { buildLocalMonth, buildLocalNow } from "@/lib/calendar/local";
import type {
  CalendarAudience,
  CalendarDay,
  CalendarMonth,
} from "@/lib/calendar/types";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

function shift(year: number, month: number, delta: number) {
  let nextMonth = month + delta;
  let nextYear = year;
  while (nextMonth < 1) {
    nextMonth += 12;
    nextYear -= 1;
  }
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  return { year: nextYear, month: nextMonth };
}

export function MonthCalendar({ audience }: { audience: CalendarAudience }) {
  const [today, setToday] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(
    null,
  );
  const [month, setMonth] = useState<CalendarMonth | null>(null);
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void calendarApi
      .now(audience)
      .then((now) => {
        if (cancelled) return;
        setToday(now.gregorian.text);
        setCursor({ year: now.jalali.year, month: now.jalali.month });
      })
      .catch(() => {
        if (cancelled) return;
        const now = buildLocalNow(Date.now());
        setToday(now.gregorian.text);
        setCursor({ year: now.jalali.year, month: now.jalali.month });
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  useEffect(() => {
    if (!cursor) return;
    let cancelled = false;
    void calendarApi
      .month(audience, cursor.year, cursor.month)
      .then((next) => {
        if (cancelled) return;
        setMonth(next);
        setError(null);
        setSelected((current) => {
          if (
            current &&
            current.jalali.year === next.year &&
            current.jalali.month === next.month
          ) {
            return (
              next.days.find((day) => day.jalali.day === current.jalali.day) ??
              next.days[0] ??
              null
            );
          }
          return (
            next.days.find((day) => day.gregorian.text === today) ??
            next.days[0] ??
            null
          );
        });
      })
      .catch(() => {
        if (cancelled || !cursor) return;
        const next = buildLocalMonth(cursor.year, cursor.month);
        setMonth(next);
        setSelected(
          (current) =>
            next.days.find((day) => day.jalali.day === current?.jalali.day) ??
            next.days.find((day) => day.gregorian.text === today) ??
            next.days[0] ??
            null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [audience, cursor, today]);

  if (error && !month) {
    return (
      <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </p>
    );
  }
  if (!month || !cursor) {
    return <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            onClick={() => setCursor(shift(cursor.year, cursor.month, 1))}
            aria-label="ماه بعد"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900">
              {month.monthName} {toFa(month.year)}
            </h3>
            <p className="text-[11px] text-slate-400">
              {month.leapYear ? "سال کبیسه" : "سال عادی"}
              {month.days[0]?.occasionsStatus === "unknown"
                ? " · مناسبت رسمی این سال وارد نشده"
                : ""}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            onClick={() => setCursor(shift(cursor.year, cursor.month, -1))}
            aria-label="ماه قبل"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
          {month.weekdays.map((name) => (
            <div key={name} className={name === "جمعه" ? "text-rose-500" : ""}>
              {name}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: month.startsOn }, (_, index) => (
            <span key={`pad-${index}`} />
          ))}
          {month.days.map((day) => {
            const active = selected?.jalali.day === day.jalali.day;
            return (
              <button
                key={day.gregorian.text}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-sm",
                  day.isHoliday
                    ? "bg-rose-50 font-semibold text-rose-700"
                    : "text-slate-800 hover:bg-slate-50",
                  active && "ring-2 ring-brand",
                )}
              >
                {toFa(day.jalali.day)}
              </button>
            );
          })}
        </div>
      </section>
      <DayDetail day={selected} />
    </div>
  );
}

function DayDetail({ day }: { day: CalendarDay | null }) {
  if (!day) return null;
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={cn("text-sm font-bold", day.isHoliday ? "text-rose-700" : "text-slate-900")}>
        {day.weekdayName} {toFa(day.jalali.day)} {day.jalali.monthName}{" "}
        {toFa(day.jalali.year)}
      </p>
      <p className="mt-1 text-xs text-slate-400">{toFa(day.gregorian.text)}</p>
      {day.isFriday ? (
        <p className="mt-3 text-xs font-medium text-rose-600">تعطیل هفتگی</p>
      ) : null}
      {day.occasionsStatus === "unknown" ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          اطلاعات رسمی مناسبت‌های این سال وارد نشده است. جمعه همچنان تعطیل هفتگی است.
        </p>
      ) : null}
      {day.coverage === "holidays" && day.occasions.length === 0 && !day.isFriday ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          تعطیل رسمی برای این روز در تقویم واردشده ثبت نشده است.
        </p>
      ) : null}
      <ul className="mt-3 space-y-2">
        {day.occasions.map((item) => (
          <li
            key={`${item.title}-${item.kind}`}
            className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              item.isOfficialHoliday
                ? "bg-rose-50 text-rose-800"
                : "bg-slate-50 text-slate-700",
            )}
          >
            <p className="font-medium">{item.title}</p>
            {item.isOfficialHoliday ? (
              <p className="text-[11px] text-rose-600">تعطیل رسمی</p>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
