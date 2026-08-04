import { Progress } from "@/components/ui/progress";
import { courses } from "@/lib/mock-data";

const statusLabel = {
  active: "فعال",
  upcoming: "به‌زودی",
  completed: "تمام‌شده",
} as const;

export function CoursesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">دوره‌های من</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          همه کلاس‌ها و مسیر پیشرفت موسیقایی شما
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <article
            key={course.id}
            className="rounded-3xl border border-border bg-white p-5 transition-colors hover:border-brand-200"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-brand">
                  {course.instrument}
                </p>
                <h3 className="mt-1 text-lg font-bold">{course.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {course.teacher} · سطح {course.level}
                </p>
              </div>
              <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                {statusLabel[course.status]}
              </span>
            </div>

            <Progress value={course.progress} />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {course.sessionsDone}/{course.sessionsTotal} جلسه
              </span>
              <span>جلسه بعدی: {course.nextLesson}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
