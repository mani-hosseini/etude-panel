"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/panel/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useStudentSession } from "@/hooks/useStudentSession";
import { audienceError } from "@/lib/api/errors";
import { studioApi } from "@/lib/api/studio";
import {
  studioKeys,
  useStudioOverviewQuery,
  useStudioProfileQuery,
} from "@/lib/api/studio-queries";
import { toFa } from "@/lib/format";
import { announceSaved } from "@/lib/save-feedback";

export function TeacherProfilePage() {
  const session = useStudentSession();
  const profileQuery = useStudioProfileQuery();
  const overview = useStudioOverviewQuery();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    instrument: "",
    room: "",
    bio: "",
    phone: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setForm({
      title: profile.title ?? "",
      instrument: profile.instrument ?? "",
      room: profile.room ?? "",
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
    });
  }, [profileQuery.data]);

  const save = useMutation({
    mutationFn: () => studioApi.updateProfile(form),
    onSuccess: async () => {
      setSaved(true);
      announceSaved("پروفایل ذخیره شد.");
      window.setTimeout(() => setSaved(false), 2200);
      await queryClient.invalidateQueries({ queryKey: studioKeys.profile });
      await queryClient.invalidateQueries({ queryKey: studioKeys.overview });
    },
  });

  if (profileQuery.isPending) {
    return <Skeleton className="h-80 rounded-2xl" />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(profileQuery.error, "پروفایل استاد در دسترس نیست.")}
      </div>
    );
  }

  const profile = profileQuery.data;
  const classes = overview.data?.classes ?? [];
  const since = profile.since
    ? new Date(profile.since).toLocaleDateString("fa-IR")
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="حساب استاد"
        title="پروفایل"
        description="این اطلاعات روی سرور ذخیره می‌شود."
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="bg-navy px-5 py-8 text-white sm:px-7">
          <p className="text-[11px] tracking-wide text-brand-300">
            {profile.title || "استاد"}
          </p>
          <h3 className="mt-1 text-2xl font-semibold">{session.displayName}</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-white/65">
            {profile.bio || "معرفی هنوز ثبت نشده است."}
          </p>
        </div>
        <dl className="grid gap-px bg-border sm:grid-cols-2">
          <Row label="ساز" value={profile.instrument || "—"} />
          <Row label="اتاق ثابت" value={profile.room || "—"} />
          <Row label="شروع همکاری" value={toFa(since)} />
          <Row label="تعداد هنرجو" value={toFa(profile.studentCount)} />
        </dl>
      </section>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <h3 className="text-sm font-semibold text-navy">ویرایش پرونده</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="عنوان">
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </Field>
          <Field label="ساز">
            <Input
              value={form.instrument}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instrument: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="اتاق">
            <Input
              value={form.room}
              onChange={(event) =>
                setForm((current) => ({ ...current, room: event.target.value }))
              }
            />
          </Field>
          <Field label="تلفن">
            <Input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </Field>
        </div>
        <Field label="معرفی">
          <Textarea
            className="min-h-28"
            value={form.bio}
            onChange={(event) =>
              setForm((current) => ({ ...current, bio: event.target.value }))
            }
          />
        </Field>
        <Button type="submit" disabled={save.isPending}>
          ذخیره پروفایل
        </Button>
        {saved ? (
          <p className="text-xs text-success">پروفایل ذخیره شد.</p>
        ) : null}
        {save.isError ? (
          <p className="text-xs text-rose-600">
            {audienceError(save.error, "ذخیره پروفایل انجام نشد.")}
          </p>
        ) : null}
      </form>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-navy">روزهای تدریس</h3>
        <ul className="mt-3 space-y-2">
          {classes.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border/80 px-3 py-2.5 text-sm"
            >
              <span className="font-medium text-navy">{item.title}</span>
              <span className="text-xs text-muted-foreground">
                {item.day} {toFa(item.start)}
                {item.end ? `–${toFa(item.end)}` : ""}
              </span>
            </li>
          ))}
          {classes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز دوره‌ای به این استاد داده نشده است.
            </p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
