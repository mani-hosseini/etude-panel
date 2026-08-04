import { studentProfile } from "@/lib/mock-data";

const fields = [
  { label: "نام و نام خانوادگی", value: studentProfile.fullName },
  { label: "کد هنرجو", value: studentProfile.studentCode },
  { label: "ساز اصلی", value: studentProfile.instrument },
  { label: "سطح", value: studentProfile.level },
  { label: "تاریخ عضویت", value: studentProfile.joinedAt },
  { label: "شماره تماس", value: studentProfile.phone },
  { label: "ایمیل", value: studentProfile.email },
] as const;

export function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">پروفایل هنرجو</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          اطلاعات حساب شما (نمایش استاتیک — فعلاً قابل ویرایش نیست)
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-white">
        <div className="border-b border-border bg-brand px-6 py-8 text-white">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-brand">
            آ
          </div>
          <h3 className="mt-4 text-xl font-bold">{studentProfile.fullName}</h3>
          <p className="mt-1 text-sm text-white/75">
            هنرجوی {studentProfile.instrument} · {studentProfile.level}
          </p>
        </div>

        <dl className="divide-y divide-border">
          {fields.map((field) => (
            <div
              key={field.label}
              className="grid gap-1 px-6 py-4 sm:grid-cols-[160px_1fr] sm:items-center"
            >
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm font-medium text-foreground">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
