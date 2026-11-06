"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { toFa } from "@/lib/format";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  formatJalali,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  shiftJalaliMonth,
  todayJalali,
  type JalaliDate,
} from "@/lib/jalali";
import { cn } from "@/lib/utils";

type PanelView = "days" | "months" | "years";

type JalaliDateFieldProps = {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
};

export function JalaliDateField({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  allowEmpty = false,
}: JalaliDateFieldProps) {
  const selected = isoToJalali(value);
  const today = todayJalali();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("days");
  const [cursor, setCursor] = useState<JalaliDate>(() => selected ?? today);
  const [panel, setPanel] = useState({ top: 0, left: 0, width: 292 });
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCursor(isoToJalali(value) ?? todayJalali());
    setView("days");
  }, [open, value]);

  const placePanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 292;
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    const below = rect.bottom + 8;
    const top = below + 380 > window.innerHeight ? Math.max(8, rect.top - 388) : below;
    setPanel({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointer);
    }, 0);
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const length = jalaliMonthLength(cursor.jy, cursor.jm);
    const firstIso = jalaliToIso(cursor.jy, cursor.jm, 1);
    const firstWeekday = new Date(`${firstIso}T12:00:00`).getDay();
    const offset = (firstWeekday + 1) % 7;
    return { length, offset };
  }, [cursor.jy, cursor.jm]);

  const yearWindow = useMemo(() => {
    const start = cursor.jy - (cursor.jy % 12);
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [cursor.jy]);

  const pickDay = (jd: number) => {
    onChange(jalaliToIso(cursor.jy, cursor.jm, jd));
    setOpen(false);
  };

  const stepMonth = (delta: number) => {
    setCursor((current) => {
      const next = shiftJalaliMonth(current.jy, current.jm, delta);
      return { ...current, ...next };
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-input bg-white px-4 text-sm shadow-sm transition outline-none",
          open
            ? "border-brand ring-2 ring-brand/20"
            : "hover:border-brand/40 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20",
          value ? "text-slate-900" : "text-muted-foreground",
        )}
      >
        <span>{value ? formatJalali(value) : placeholder}</span>
        <CalendarDays className="size-4 text-slate-400" />
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              dir="rtl"
              style={{ top: panel.top, left: panel.left, width: panel.width }}
              className="fixed z-[120] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center gap-1">
                <NavButton
                  label={view === "years" ? "سال‌های قبل" : "ماه قبل"}
                  onClick={() => {
                    if (view === "years") {
                      setCursor((c) => ({ ...c, jy: c.jy - 12 }));
                    } else {
                      stepMonth(-1);
                    }
                  }}
                >
                  <ChevronRight className="size-4" />
                </NavButton>
                <button
                  type="button"
                  onClick={() =>
                    setView((current) => (current === "months" ? "days" : "months"))
                  }
                  className="h-8 min-w-0 flex-1 rounded-lg px-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  {JALALI_MONTHS[cursor.jm - 1]}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setView((current) => (current === "years" ? "days" : "years"))
                  }
                  className="h-8 w-[4.5rem] rounded-lg text-sm font-semibold tabular-nums text-slate-800 hover:bg-slate-100"
                >
                  {toFa(cursor.jy)}
                </button>
                <NavButton
                  label={view === "years" ? "سال‌های بعد" : "ماه بعد"}
                  onClick={() => {
                    if (view === "years") {
                      setCursor((c) => ({ ...c, jy: c.jy + 12 }));
                    } else {
                      stepMonth(1);
                    }
                  }}
                >
                  <ChevronLeft className="size-4" />
                </NavButton>
              </div>

              {view === "days" ? (
                <div className="grid grid-cols-7 gap-1 text-center">
                  {JALALI_WEEKDAYS.map((day) => (
                    <span
                      key={day}
                      className="pb-1 text-[11px] font-semibold text-slate-400"
                    >
                      {day}
                    </span>
                  ))}
                  {Array.from({ length: days.offset }).map((_, i) => (
                    <span key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: days.length }).map((_, i) => {
                    const jd = i + 1;
                    const isSelected =
                      selected?.jy === cursor.jy &&
                      selected?.jm === cursor.jm &&
                      selected?.jd === jd;
                    const isToday =
                      today.jy === cursor.jy &&
                      today.jm === cursor.jm &&
                      today.jd === jd;
                    return (
                      <button
                        key={jd}
                        type="button"
                        onClick={() => pickDay(jd)}
                        className={cn(
                          "flex size-8 items-center justify-center justify-self-center rounded-lg text-sm tabular-nums transition",
                          isSelected
                            ? "bg-brand font-bold text-white"
                            : isToday
                              ? "bg-brand/10 font-semibold text-brand"
                              : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {toFa(jd)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {view === "months" ? (
                <div className="grid grid-cols-3 gap-1">
                  {JALALI_MONTHS.map((month, index) => {
                    const jm = index + 1;
                    const active = cursor.jm === jm;
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          setCursor((c) => ({ ...c, jm }));
                          setView("days");
                        }}
                        className={cn(
                          "rounded-lg px-2 py-2 text-sm font-medium transition",
                          active
                            ? "bg-brand font-bold text-white"
                            : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {view === "years" ? (
                <div className="grid grid-cols-3 gap-1">
                  {yearWindow.map((year) => {
                    const active = cursor.jy === year;
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setCursor((c) => ({ ...c, jy: year }));
                          setView("days");
                        }}
                        className={cn(
                          "rounded-lg px-2 py-2 text-sm font-medium tabular-nums transition",
                          active
                            ? "bg-brand font-bold text-white"
                            : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {toFa(year)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/5"
                  onClick={() => {
                    const now = todayJalali();
                    onChange(jalaliToIso(now.jy, now.jm, now.jd));
                    setOpen(false);
                  }}
                >
                  امروز
                </button>
                {allowEmpty ? (
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    بدون تاریخ
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}
