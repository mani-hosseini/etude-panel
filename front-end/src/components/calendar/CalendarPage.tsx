"use client";

import { useEffect, useState } from "react";

import { IranClock } from "@/components/calendar/IranClock";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calendarApi } from "@/lib/api/calendar";
import type { CalendarAudience } from "@/lib/calendar/types";
import { toFa } from "@/lib/format";

export function CalendarPage({ audience }: { audience: CalendarAudience }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            تقویم
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            ساعت و تاریخ به وقت تهران است و به ساعت دستگاه وابسته نیست.
          </p>
        </div>
        <IranClock audience={audience} />
      </div>
      <MonthCalendar audience={audience} />
      {audience === "admin" ? <OccasionManager /> : null}
    </div>
  );
}

function OccasionManager() {
  const [year, setYear] = useState(1405);
  const [rows, setRows] = useState<
    Array<{
      id: string;
      month: number;
      day: number;
      title: string;
      isOfficialHoliday: boolean;
    }>
  >([]);
  const [coverage, setCoverage] = useState<string>("unknown");
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [holiday, setHoliday] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = (target = year) =>
    calendarApi.occasions(target).then((data) => {
      setRows(data.occasions);
      setCoverage(data.coverage);
    });

  useEffect(() => {
    void load().catch(() => setMessage("فهرست مناسبت‌ها خوانده نشد."));
  }, [year]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">مناسبت‌ها و تعطیلات</h3>
          <p className="text-xs text-slate-500">
            وضعیت سال {toFa(year)}:{" "}
            {coverage === "unknown"
              ? "نامشخص"
              : coverage === "holidays"
                ? "تعطیلات رسمی"
                : "کامل"}
          </p>
        </div>
        <Input
          value={String(year)}
          onChange={(event) => setYear(Number(event.target.value) || year)}
          className="h-10 w-28 rounded-xl"
          inputMode="numeric"
          aria-label="سال شمسی"
        />
      </div>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[5rem_5rem_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void calendarApi
            .createOccasion({
              year,
              month: Number(month),
              day: Number(day),
              title: title.trim(),
              kind: holiday ? "OFFICIAL" : "NATIONAL",
              isOfficialHoliday: holiday,
              source: "ثبت موردی مدیر سیستم",
            })
            .then(() => {
              setTitle("");
              setMessage("مناسبت ثبت شد.");
              return load();
            })
            .catch(() => setMessage("ثبت مناسبت انجام نشد."));
        }}
      >
        <Input
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          placeholder="ماه"
          className="h-10 rounded-xl"
        />
        <Input
          value={day}
          onChange={(event) => setDay(event.target.value)}
          placeholder="روز"
          className="h-10 rounded-xl"
        />
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="عنوان مناسبت"
          className="h-10 rounded-xl"
        />
        <Button type="submit" className="rounded-xl" disabled={title.trim().length < 2}>
          ثبت
        </Button>
      </form>
      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={holiday}
          onChange={(event) => setHoliday(event.target.checked)}
        />
        تعطیل رسمی
      </label>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
      <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50"
          >
            <span className={row.isOfficialHoliday ? "text-rose-700" : "text-slate-700"}>
              {toFa(row.day)} / {toFa(row.month)} · {row.title}
            </span>
            <button
              type="button"
              className="text-xs text-slate-400"
              onClick={() =>
                void calendarApi.deleteOccasion(row.id).then(() => load())
              }
            >
              حذف
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
