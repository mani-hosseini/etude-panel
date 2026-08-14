"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { Award, BadgeCheck, Music2, Save } from "lucide-react";

import { AvatarUpload } from "@/components/panel/AvatarUpload";
import { PageHeader } from "@/components/panel/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentLevelBadge } from "@/components/ui/student-level-badge";
import { copy } from "@/constants/copy";
import { useStudentSession } from "@/hooks/useStudentSession";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import type { ProfilePayload } from "@/lib/api/types";
import {
  queryErrorMessage,
  queryKeys,
  useProfileQuery,
} from "@/lib/api/queries";
import { saveSession } from "@/lib/auth";
import { parseStudentLevel } from "@/lib/student-level";
import { toFa } from "@/lib/format";

function ProfileEditForm({
  student,
  loggedInAt,
}: {
  student: ProfilePayload["student"];
  loggedInAt: string;
}) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [phone, setPhone] = useState(student.phone ?? "");
  const [nationalId, setNationalId] = useState(student.nationalId ?? "");
  const [address, setAddress] = useState(student.address ?? "");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        address: address.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
      }),
    onSuccess: async (data) => {
      setFormError(null);
      setFormSuccess("اطلاعات با موفقیت ذخیره شد.");
      setPassword("");
      saveSession({
        firstName: data.student.firstName,
        lastName: data.student.lastName,
        displayName: data.student.displayName,
        loggedInAt,
        studentCode: data.student.studentCode,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: (err) => {
      setFormSuccess(null);
      setFormError(audienceError(err, "ذخیره اطلاعات انجام نشد."));
    },
  });

  return (
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h3 className="text-base font-bold">ویرایش اطلاعات</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          نام و در صورت نیاز رمز عبور خود را به‌روز کنید
        </p>
      </div>
      <form
        className="space-y-4 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setFormSuccess(null);
          setFormError(null);
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-firstName">نام</Label>
            <Input
              id="profile-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-lastName">نام خانوادگی</Label>
            <Input
              id="profile-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>سطح</Label>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-muted/40 px-3">
              <StudentLevelBadge level={student.level} />
              <span className="text-[11px] text-muted-foreground">
                فقط ادمین می‌تواند تغییر دهد
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">شماره تلفن</Label>
            <Input
              id="profile-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl"
              placeholder="0912…"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-nationalId">کد ملی</Label>
            <Input
              id="profile-nationalId"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="rounded-xl"
              placeholder="001…"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-address">آدرس</Label>
            <Input
              id="profile-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-xl"
              placeholder="شهر، خیابان، پلاک…"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-password">رمز عبور جدید</Label>
            <Input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl"
              placeholder="خالی بگذارید اگر نمی‌خواهید عوض شود"
              autoComplete="new-password"
            />
          </div>
        </div>
        {formError ? (
          <p className="text-sm text-destructive">{formError}</p>
        ) : null}
        {formSuccess ? (
          <p className="text-sm text-emerald-600">{formSuccess}</p>
        ) : null}
        <Button type="submit" className="rounded-xl" disabled={save.isPending}>
          <Save className="size-4" />
          {save.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </Button>
      </form>
    </section>
  );
}

export function ProfilePage() {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const session = useStudentSession();
  const query = useProfileQuery();

  if (query.isPending) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (query.isError) {
    return (
      <div className="surface-panel p-8 text-center text-sm text-destructive">
        {queryErrorMessage(query.error)}
      </div>
    );
  }

  const { student, primaryCourse, achievements, courses } = query.data;
  const fullName = student.displayName;
  const initial = student.firstName.charAt(0) || "ه";

  const invalidateAvatar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
  };

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      <PageHeader
        eyebrow="هنرجوی اتود"
        title="پروفایل هنرجو"
        description={`اطلاعات شما و دوره‌های ثبت‌شده در ${copy.academyName}.`}
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-black/15 blur-2xl"
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto sm:mx-0">
              <AvatarUpload
                avatarUrl={student.avatarUrl}
                fallbackInitial={initial}
                sizeClassName="size-20 text-3xl sm:size-24 sm:text-4xl"
                onChanged={async () => {
                  await invalidateAvatar();
                }}
              />
              <span className="pointer-events-none absolute bottom-8 -left-1 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white">
                <BadgeCheck className="size-3" />
                تاییدشده
              </span>
            </div>
            <div className="text-center sm:text-right">
              <h3 className="text-2xl font-bold sm:text-3xl">{fullName}</h3>
              <p className="mt-1.5 text-sm text-white/80">
                {student.programTitle} · سطح{" "}
                {toFa(parseStudentLevel(student.level))}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs text-white/85">
                <Music2 className="size-3.5" strokeWidth={1.75} />
                {primaryCourse?.teacher ?? `${courses.length} دوره`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: "حضور", value: student.attendanceRate },
              { label: "جلسات", value: student.totalHours },
              { label: "دوره", value: student.activeCoursesCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 px-3 py-3 text-center backdrop-blur-sm"
              >
                <p className="text-[11px] text-white/65">{item.label}</p>
                <p className="mt-1 font-sans text-lg font-bold tabular-nums sm:text-xl">
                  {toFa(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <ProfileEditForm
        key={`${student.id}-${student.displayName}-${student.level}`}
        student={student}
        loggedInAt={session.loggedInAt}
      />

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3 className="text-base font-bold">مسیر یادگیری</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            وضعیت فعلی شما در دوره‌های {copy.academyName}
          </p>
        </div>
        <dl className="grid sm:grid-cols-2">
          {[
            { label: "دوره فعال", value: student.programTitle },
            {
              label: "مدرس",
              value: primaryCourse?.teacher ?? "—",
            },
            { label: "سطح", value: `سطح ${toFa(parseStudentLevel(student.level))}` },
            {
              label: "زمان کلاس",
              value: primaryCourse ? `${primaryCourse.timeShort}` : "—",
            },
          ].map((field) => (
            <div
              key={field.label}
              className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 last:border-b-0 sm:px-6 sm:odd:border-l"
            >
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm font-semibold text-navy">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <Award className="size-4" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-base font-bold">دستاوردهای اخیر</h3>
            <p className="text-xs text-muted-foreground">
              نشان‌های پیشرفت در مسیر موسیقی
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {achievements.map((item, index) => (
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 + index * 0.05 }}
              className="rounded-2xl border border-brand-100 bg-linear-to-b from-brand-50/80 to-white p-4"
            >
              <p className="text-sm font-bold text-navy">{item.title}</p>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
