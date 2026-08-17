"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, Save } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminApi,
  type AdminSession,
  type SessionStatus,
} from "@/lib/api/admin-client";
import { adminQueryKeys } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { toFa, formatTimeRange, parseTimeRange } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const statusLabel: Record<SessionStatus, string> = {
  AVAILABLE: "در دسترس",
  UPCOMING: "به‌زودی",
  LOCKED: "قفل",
};

type SessionFormState = {
  number: string;
  title: string;
  summary: string;
  topicsText: string;
  status: SessionStatus;
  durationLabel: string;
  dateLabel: string;
  timeStart: string;
  timeEnd: string;
};

const emptyCreate: SessionFormState = {
  number: "",
  title: "",
  summary: "",
  topicsText: "",
  status: "LOCKED",
  durationLabel: "۱۲۰ دقیقه",
  dateLabel: "",
  timeStart: "11:00",
  timeEnd: "13:00",
};

function sessionToForm(
  session: AdminSession,
  courseTimeShort?: string,
): SessionFormState {
  const fallback = parseTimeRange(courseTimeShort);
  return {
    number: String(session.number),
    title: session.title,
    summary: session.summary,
    topicsText: session.topics.join("\n"),
    status: session.status,
    durationLabel: session.durationLabel,
    dateLabel: session.dateLabel,
    timeStart: session.timeStart || fallback?.start || "11:00",
    timeEnd: session.timeEnd || fallback?.end || "13:00",
  };
}

function formToBody(form: SessionFormState) {
  return {
    number: Number(form.number),
    title: form.title.trim(),
    summary: form.summary.trim(),
    topics: form.topicsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    status: form.status,
    durationLabel: form.durationLabel.trim() || "۱۲۰ دقیقه",
    dateLabel: form.dateLabel.trim() || "—",
    timeStart: form.timeStart || null,
    timeEnd: form.timeEnd || null,
  };
}

function SessionFields({
  form,
  setForm,
  numberEditable = true,
}: {
  form: SessionFormState;
  setForm: (next: SessionFormState) => void;
  numberEditable?: boolean;
}) {
  const set =
    (key: keyof SessionFormState) =>
    (value: string) =>
      setForm({ ...form, [key]: value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>شماره جلسه</Label>
        <Input
          type="number"
          min={1}
          disabled={!numberEditable}
          value={form.number}
          onChange={(e) => set("number")(e.target.value)}
          className="rounded-xl text-right"
        />
      </div>
      <div className="space-y-1.5">
        <Label>وضعیت</Label>
        <Select
          value={form.status}
          onValueChange={(value) =>
            setForm({ ...form, status: value as SessionStatus })
          }
        >
          <SelectTrigger className="rounded-xl text-right">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="AVAILABLE">در دسترس</SelectItem>
            <SelectItem value="UPCOMING">به‌زودی</SelectItem>
            <SelectItem value="LOCKED">قفل</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>عنوان</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title")(e.target.value)}
          className="rounded-xl text-right"
          placeholder="مثلاً پایه‌های نت‌خوانی و ریتم"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>خلاصه</Label>
        <Textarea
          rows={3}
          value={form.summary}
          onChange={(e) => set("summary")(e.target.value)}
          placeholder="توضیح کوتاه جلسه برای هنرجو"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>موضوعات / تگ‌ها (هر خط یک مورد)</Label>
        <Textarea
          rows={4}
          value={form.topicsText}
          onChange={(e) => set("topicsText")(e.target.value)}
          placeholder={"صدا و ارتعاش\nحامل و کلید سل\nریتم و میزان‌نما"}
        />
        <p className="text-[11px] text-slate-400">
          همین موارد به‌صورت دکمه‌های موضوع در پنل هنرجو نشان داده می‌شوند.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>تاریخ جلسه</Label>
        <Input
          value={form.dateLabel}
          onChange={(e) => set("dateLabel")(e.target.value)}
          className="rounded-xl text-right"
          placeholder="مثلاً ۱۴۰۵/۰۵/۱۵"
        />
        <p className="text-[11px] text-slate-400">
          این تاریخ در «جلسه بعدی» و برنامه پنل هنرجو نمایش داده می‌شود.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>ساعت جلسه</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">شروع</p>
            <Input
              type="time"
              dir="ltr"
              value={form.timeStart}
              onChange={(e) => set("timeStart")(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400">پایان</p>
            <Input
              type="time"
              dir="ltr"
              value={form.timeEnd}
              onChange={(e) => set("timeEnd")(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          نمایش در پنل هنرجو:{" "}
          {formatTimeRange(form.timeStart, form.timeEnd, "—")}
        </p>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>مدت جلسه</Label>
        <Input
          value={form.durationLabel}
          onChange={(e) => set("durationLabel")(e.target.value)}
          className="rounded-xl text-right"
          placeholder="۱۲۰ دقیقه"
        />
      </div>
    </div>
  );
}

export function CourseSessionsPanel({
  courseId,
  courseSlug,
  courseTimeShort,
  sessions,
}: {
  courseId: string;
  courseSlug: string;
  courseTimeShort?: string;
  sessions: AdminSession[];
}) {
  const queryClient = useQueryClient();
  const courseTimes = parseTimeRange(courseTimeShort);
  const initialForm: SessionFormState = {
    ...emptyCreate,
    timeStart: courseTimes?.start ?? emptyCreate.timeStart,
    timeEnd: courseTimes?.end ?? emptyCreate.timeEnd,
  };
  const [createForm, setCreateForm] = useState<SessionFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SessionFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(courseId),
      }),
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(courseSlug),
      }),
    ]);
  };

  const create = useMutation({
    mutationFn: () => adminApi.createSession(courseId, formToBody(createForm)),
    onSuccess: async () => {
      setCreateForm(initialForm);
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(audienceError(err, "ذخیره جلسه انجام نشد.")),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; body: ReturnType<typeof formToBody> }) =>
      adminApi.updateSession(payload.id, payload.body),
    onSuccess: async () => {
      setEditingId(null);
      setEditForm(null);
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(audienceError(err, "ذخیره جلسه انجام نشد.")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteSession(id),
    onSuccess: invalidate,
  });

  const openEdit = (session: AdminSession) => {
    if (editingId === session.id) {
      setEditingId(null);
      setEditForm(null);
      return;
    }
    setEditingId(session.id);
    setEditForm(sessionToForm(session, courseTimeShort));
    setError(null);
  };

  return (
    <div dir="rtl" className="space-y-4 text-right">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              افزودن جلسه جدید
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              عنوان، خلاصه، موضوعات و وضعیت از همین‌جا برای پنل هنرجو تنظیم
              می‌شود.
            </p>
          </div>
          <SessionFields form={createForm} setForm={setCreateForm} />
          <Button
            type="button"
            className="rounded-xl"
            disabled={!createForm.number || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            افزودن جلسه
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        {sessions.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            جلسه‌ای ثبت نشده است.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const open = editingId === session.id;
              return (
                <div key={session.id} className="px-4 py-4 sm:px-5">
                  <div
                    dir="ltr"
                    className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div dir="rtl" className="min-w-0 flex-1 space-y-2 text-right">
                      <div className="flex flex-wrap items-center justify-start gap-2">
                        <Badge variant="secondary" className="rounded-lg">
                          جلسه {toFa(session.number)}
                        </Badge>
                        <Badge variant="outline" className="rounded-lg">
                          {statusLabel[session.status]}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {toFa(session.slideCount)} اسلاید
                          {(session.attachmentCount ?? 0) > 0
                            ? ` · ${toFa(session.attachmentCount ?? 0)} پیوست`
                            : ""}
                          {session.dateLabel && session.dateLabel !== "قفل"
                            ? ` · ${toFa(session.dateLabel)}`
                            : ""}
                          {session.timeLabel
                            ? ` · ${toFa(session.timeLabel)}`
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {session.title || `جلسه ${toFa(session.number)}`}
                      </p>
                      {session.summary ? (
                        <p className="line-clamp-2 text-xs leading-6 text-slate-500">
                          {session.summary}
                        </p>
                      ) : null}
                      {session.topics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {session.topics.map((topic, topicIndex) => (
                            <span
                              key={`${session.id}-topic-${topicIndex}`}
                              className="rounded-lg bg-brand/10 px-2 py-0.5 text-[11px] text-brand"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => openEdit(session)}
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            open && "rotate-180",
                          )}
                        />
                        {open ? "بستن" : "ویرایش محتوا"}
                      </Button>
                      <AdminConfirmDelete
                        title="حذف جلسه؟"
                        description={`جلسه ${session.number} و تمام اسلایدهایش حذف می‌شود.`}
                        onConfirm={() => remove.mutate(session.id)}
                        disabled={remove.isPending}
                      />
                      <Button asChild size="sm" className="rounded-xl">
                        <Link
                          href={adminRoutes.courseSession(
                            courseSlug,
                            session.number,
                          )}
                        >
                          محتوای جلسه
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {open && editForm ? (
                    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <SessionFields
                        form={editForm}
                        setForm={setEditForm}
                        numberEditable
                      />
                      <Button
                        type="button"
                        className="rounded-xl"
                        disabled={update.isPending || !editForm.number}
                        onClick={() =>
                          update.mutate({
                            id: session.id,
                            body: formToBody(editForm),
                          })
                        }
                      >
                        {update.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        ذخیره تغییرات
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
