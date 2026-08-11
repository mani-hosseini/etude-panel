"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { Award, BadgeCheck, Music2, Save } from "lucide-react";

import { AvatarUpload } from "@/components/panel/AvatarUpload";
import { PageHeader } from "@/components/panel/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/constants/copy";
import { useStudentSession } from "@/hooks/useStudentSession";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/http";
import {
  queryErrorMessage,
  queryKeys,
  useProfileQuery,
} from "@/lib/api/queries";
import { saveSession } from "@/lib/auth";
import { toFa, cleanCourseTitle } from "@/lib/format";

export function ProfilePage() {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const session = useStudentSession();
  const query = useProfileQuery();
  const fullName = session.displayName;
  const firstName = session.firstName;
  const initial = firstName.charAt(0) || "ه";

  const [firstNameDraft, setFirstNameDraft] = useState("");
  const [lastNameDraft, setLastNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [nationalIdDraft, setNationalIdDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setFirstNameDraft(query.data.student.firstName);
    setLastNameDraft(query.data.student.lastName);
    setPhoneDraft(query.data.student.phone ?? "");
    setNationalIdDraft(query.data.student.nationalId ?? "");
    setAddressDraft(query.data.student.address ?? "");
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      api.updateProfile({
        firstName: firstNameDraft.trim(),
        lastName: lastNameDraft.trim(),
        phone: phoneDraft.trim(),
        nationalId: nationalIdDraft.trim(),
        address: addressDraft.trim(),
        password: password || undefined,
        confirmPassword: password ? confirmPassword : undefined,
      }),
    onSuccess: async (result) => {
      setFormError(null);
      setFormSuccess(
        password
          ? "اطلاعات ذخیره شد. لطفاً دوباره وارد شوید."
          : "اطلاعات پروفایل ذخیره شد.",
      );
      setPassword("");
      setConfirmPassword("");
      saveSession({
        firstName: result.firstName,
        lastName: result.lastName,
        displayName: result.displayName,
        loggedInAt: session.loggedInAt,
        studentCode: result.studentCode,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: (err) => {
      setFormSuccess(null);
      setFormError(
        err instanceof ApiError ? err.message : "ذخیره اطلاعات ناموفق بود.",
      );
    },
  });

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
  const learningFields = [
    {
      label: "دوره فعال",
      value: cleanCourseTitle(student.programTitle),
    },
    {
      label: "مدرس",
      value: primaryCourse?.teacher ?? "—",
    },
    {
      label: "زمان کلاس",
      value: primaryCourse ? `${primaryCourse.timeShort}` : "—",
    },
  ] as const;

  const invalidateAvatar = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.profile }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (password && password !== confirmPassword) {
      setFormError("تکرار رمز عبور مطابقت ندارد.");
      return;
    }
    save.mutate();
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
                {cleanCourseTitle(student.programTitle)}
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

      <section className="surface-panel p-5 sm:p-6">
        <h3 className="text-base font-bold">ویرایش اطلاعات</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          مشخصات تماس و در صورت نیاز رمز عبور خود را به‌روز کنید.
        </p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-firstName">نام</Label>
            <Input
              id="profile-firstName"
              value={firstNameDraft}
              onChange={(e) => setFirstNameDraft(e.target.value)}
              className="rounded-xl"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-lastName">نام خانوادگی</Label>
            <Input
              id="profile-lastName"
              value={lastNameDraft}
              onChange={(e) => setLastNameDraft(e.target.value)}
              className="rounded-xl"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">شماره تلفن</Label>
            <Input
              id="profile-phone"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              className="rounded-xl"
              inputMode="tel"
              placeholder="09121234567"
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-nationalId">کد ملی</Label>
            <Input
              id="profile-nationalId"
              value={nationalIdDraft}
              onChange={(e) => setNationalIdDraft(e.target.value)}
              className="rounded-xl"
              inputMode="numeric"
              placeholder="۱۰ رقم"
              dir="ltr"
              maxLength={10}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-address">آدرس</Label>
            <Input
              id="profile-address"
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
              className="rounded-xl"
              placeholder="شهر، خیابان، پلاک…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-password">رمز عبور جدید (اختیاری)</Label>
            <Input
              id="profile-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl"
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-confirm">تکرار رمز جدید</Label>
            <Input
              id="profile-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl"
              minLength={8}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="rounded-xl"
              disabled={save.isPending}
            >
              <Save className="size-4" />
              {save.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </div>
        </form>
        {formError ? (
          <p className="mt-3 text-sm text-rose-600">{formError}</p>
        ) : null}
        {formSuccess ? (
          <p className="mt-3 text-sm text-emerald-700">{formSuccess}</p>
        ) : null}
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3 className="text-base font-bold">مسیر یادگیری</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            وضعیت فعلی شما در دوره‌های {copy.academyName}
          </p>
        </div>
        <dl className="grid sm:grid-cols-2">
          {learningFields.map((field) => (
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
