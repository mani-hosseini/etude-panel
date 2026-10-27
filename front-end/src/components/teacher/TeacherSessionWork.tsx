"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { audienceError } from "@/lib/api/errors";
import {
  studioApi,
  type StudioAssignment,
  type StudioStudentSession,
} from "@/lib/api/studio";
import { studioKeys } from "@/lib/api/studio-queries";
import { toFa } from "@/lib/format";
import { announceSaved } from "@/lib/save-feedback";
import { cn } from "@/lib/utils";

const CLASS_MARKS = [
  { id: "present", label: "کلاس تشکیل شد" },
  { id: "absent", label: "کلاس تشکیل نشد" },
] as const;

const AXES = ["تکنیک", "تئوری موسیقی", "قطعه", "سلفژ"] as const;
type Axis = (typeof AXES)[number];

type AttendanceStatus = (typeof CLASS_MARKS)[number]["id"];

const statusLabel: Record<string, string> = {
  available: "در دسترس",
  upcoming: "به‌زودی",
  locked: "قفل",
};

export function TeacherSessionWork({
  studentId,
  sessions,
  assignments,
  sessionId,
  onSessionIdChange,
}: {
  studentId: string;
  sessions: StudioStudentSession[];
  assignments: StudioAssignment[];
  sessionId: string;
  onSessionIdChange: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const session =
    sessions.find((item) => item.id === sessionId) ?? sessions[0] ?? null;
  const nextSession = session
    ? (sessions.find(
        (item) =>
          item.courseId === session.courseId &&
          item.number === session.number + 1,
      ) ?? null)
    : null;
  const homeworkSession = nextSession ?? session;

  const [category, setCategory] = useState<Axis>("تکنیک");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentAttendance = useMemo(
    () => (session?.attendance as AttendanceStatus | null) ?? null,
    [session],
  );

  const nextAssignments = assignments.filter(
    (item) => item.sessionId === homeworkSession?.id,
  );

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studioKeys.student(studentId) }),
      queryClient.invalidateQueries({ queryKey: studioKeys.assignments }),
      queryClient.invalidateQueries({ queryKey: studioKeys.overview }),
      queryClient.invalidateQueries({ queryKey: studioKeys.today }),
    ]);

  const confirm = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("جلسه‌ای انتخاب نشده");
      return studioApi.confirmSession(studentId, session.id);
    },
    onSuccess: async (result) => {
      setError(null);
      const text = result.isLast
        ? `جلسه ${toFa(result.confirmedNumber)} تأیید شد. این آخرین جلسه است.`
        : `جلسه ${toFa(result.confirmedNumber)} تأیید شد. جلسه بعد وقتی برای هنرجو باز می‌شود که تکلیفش را ثبت کنید.`;
      setMessage(text);
      announceSaved(text);
      await refresh();
    },
    onError: (err) => {
      setMessage(null);
      setError(audienceError(err, "تأیید جلسه انجام نشد."));
    },
  });

  const mark = useMutation({
    mutationFn: (attendance: AttendanceStatus) => {
      if (!session) throw new Error("جلسه‌ای انتخاب نشده");
      return studioApi.saveSessionWork(session.id, {
        studentId,
        attendance,
      });
    },
    onSuccess: async (_result, attendance) => {
      setError(null);
      const text =
        attendance === "absent"
          ? "کلاس تشکیل نشد. جلسه برای هنرجو باز می‌شود و پیام غیبت را می‌بیند؛ تکلیفی داده نمی‌شود."
          : "کلاس تشکیل شد و این جلسه برای هنرجو باز شد.";
      setMessage(text);
      announceSaved(text);
      await refresh();
    },
    onError: (err) => {
      setMessage(null);
      setError(audienceError(err, "ثبت حضور انجام نشد."));
    },
  });

  const create = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("جلسه‌ای انتخاب نشده");
      return studioApi.createAssignment({
        courseId: session.courseId,
        sessionId: session.id,
        studentIds: [studentId],
        category,
        title: title.trim(),
        source: source.trim() || undefined,
        note: note.trim() || undefined,
        dueLabel: homeworkSession
          ? `جلسه ${homeworkSession.number}`
          : "کلاس بعد",
        forNextSession: Boolean(nextSession),
      });
    },
    onSuccess: async () => {
      setTitle("");
      setSource("");
      setNote("");
      setError(null);
      const targetNumber = homeworkSession?.number ?? session?.number;
      const text = nextSession
        ? `تمرین جلسه ${toFa(targetNumber)} ثبت شد و برای هنرجو باز شد. نمره اجرا را جلسه بعد بدهید.`
        : "تمرین این جلسه ثبت شد. نمره اجرا را بعد از اجرای هنرجو بدهید.";
      setMessage(text);
      announceSaved(text);
      await refresh();
    },
    onError: (err) => {
      setMessage(null);
      setError(audienceError(err, "ثبت تمرین انجام نشد."));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => studioApi.deleteAssignment(id),
    onSuccess: async () => {
      announceSaved("تمرین حذف شد.");
      await refresh();
    },
  });

  if (sessions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        برای این هنرجو جلسه‌ای در کلاس‌های شما نیست.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <WorkBlock
        title="جلسه و تشکیل کلاس"
        hint="جلسه را انتخاب کنید. اگر کلاس تشکیل شد جلسه برای هنرجو باز می‌شود؛ اگر تشکیل نشد همان جلسه را با پیام غیبت می‌بیند و تکلیفی نمی‌گیرد."
      >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_auto] sm:items-end">
        <div>
          <Label className="mb-1.5 block">جلسه</Label>
          <Select
            value={session?.id}
            onValueChange={(value) => {
              onSessionIdChange(value);
              setMessage(null);
              setError(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="انتخاب جلسه" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {`جلسه ${toFa(item.number)}${item.title ? ` — ${item.title}` : ""}${item.current ? " · جاری" : ""}${item.confirmed ? " · تأییدشده" : ""} · ${statusLabel[item.status] ?? item.status}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {session ? (
          <p className="text-xs text-muted-foreground">
            {session.courseTitle} · {toFa(session.dateLabel)}
          </p>
        ) : null}
      </div>

      {session ? (
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          {CLASS_MARKS.map((status) => {
            const classHeld =
              currentAttendance != null && currentAttendance !== "absent";
            const selected =
              status.id === "absent"
                ? currentAttendance === "absent"
                : classHeld;
            return (
              <button
                key={status.id}
                type="button"
                disabled={mark.isPending}
                onClick={() => mark.mutate(status.id)}
                className={cn(
                  "rounded-2xl px-3 py-2.5 text-sm font-medium ring-1 transition disabled:opacity-60",
                  selected
                    ? status.id === "absent"
                      ? "bg-destructive text-white ring-destructive"
                      : "bg-navy text-white ring-navy"
                    : "bg-white text-muted-foreground ring-border hover:text-navy",
                )}
              >
                {status.label}
              </button>
            );
          })}
        </div>
      ) : null}
      </WorkBlock>

      {currentAttendance === "absent" ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-6 text-rose-700">
          کلاس تشکیل نشد. جلسه برای هنرجو باز می‌شود و پیام غیبت را می‌بیند؛
          تکلیفی به او داده نمی‌شود.
        </p>
      ) : (
        <>
          {nextAssignments.length > 0 ? (
            <WorkBlock
              title={
                nextSession
                  ? `تمرین‌های جلسه بعد · جلسه ${toFa(nextSession.number)}`
                  : "تمرین‌های این جلسه"
              }
              hint="نمره اجرا را جلسه بعد، بعد از اجرای هنرجو، ثبت کنید."
            >
            <ul className="space-y-2">
              {nextAssignments.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border/80 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.source || item.note || "تمرین جلسه بعد"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="outline">{item.category}</Badge>
                      <button
                        type="button"
                        onClick={() => remove.mutate(item.id)}
                        className="text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            </WorkBlock>
          ) : null}

          <WorkBlock
            title={
              nextSession
                ? `تمرین جلسه بعد · جلسه ${toFa(nextSession.number)}`
                : "تمرین جدید"
            }
            hint="فقط چهار محور اتود: تکنیک، تئوری، قطعه و سلفژ. نمره اجرا جلسه بعد ثبت می‌شود."
          >
          <div>
            <Label className="mb-1.5 block">محور</Label>
            <div className="flex flex-wrap gap-1.5">
              {AXES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
                    category === item
                      ? "bg-navy text-white ring-navy"
                      : "bg-white text-muted-foreground ring-border hover:text-navy",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">عنوان تمرین</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلاً درس ۲ هانون"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">منبع</Label>
            <Input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Hanon · صفحه ۱۲"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">نکاتی که باید رعایت شود</Label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="دست جدا، تمپو ۶۰، مچ آرام…"
              className="min-h-24"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={create.isPending || !title.trim()}
            onClick={() => create.mutate()}
          >
            {nextSession
              ? `ثبت تمرین جلسه ${toFa(nextSession.number)}`
              : "ثبت تمرین این جلسه"}
          </Button>
          </WorkBlock>
        </>
      )}
      <div className="border-t border-border pt-4">
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={confirm.isPending || mark.isPending || !session}
        onClick={() => confirm.mutate()}
      >
        <Check className="size-4" />
        {session?.confirmed ? "تأیید مجدد جلسه" : "تأیید جلسه"}
      </Button>
      </div>
    </div>
  );
}

function WorkBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
