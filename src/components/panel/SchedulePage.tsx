import { MapPin, UserRound } from "lucide-react";

import { schedule } from "@/lib/mock-data";

const typeLabel = {
  private: "خصوصی",
  group: "گروهی",
  theory: "تئوری",
} as const;

export function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">برنامه کلاس‌ها</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          زمان‌بندی هفتگی جلسات شما در آموزشگاه اتود
        </p>
      </div>

      <div className="space-y-3">
        {schedule.map((lesson) => (
          <article
            key={lesson.id}
            className="grid gap-4 rounded-3xl border border-border bg-white p-5 sm:grid-cols-[140px_1fr]"
          >
            <div className="rounded-2xl bg-brand px-4 py-3 text-white">
              <p className="text-xs text-white/70">{lesson.day}</p>
              <p className="mt-1 text-sm font-bold leading-6">{lesson.time}</p>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold">{lesson.title}</h3>
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                  {typeLabel[lesson.type]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {lesson.course}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5" strokeWidth={1.75} />
                  {lesson.teacher}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" strokeWidth={1.75} />
                  {lesson.room}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
