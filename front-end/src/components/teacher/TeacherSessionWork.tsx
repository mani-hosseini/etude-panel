"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const ADD_TITLE_VALUE = "__add_title__";
const EMPTY_TITLE_VALUE = "__empty_title__";
const TITLES_STORAGE_KEY = "etude-exercise-titles-v1";

const DEFAULT_TITLES: Record<Axis, string[]> = {
  تکنیک: ["بیر", "چرنی ۵۹۹", "چرنی ۲۹۹", "کلاسیک فاوریز", "گام و آرپژ"],
  "تئوری موسیقی": [
    "تئوری موسیقی پرویز منصوری",
    "کتاب هارمونی دوبوفسکی",
  ],
  قطعه: [],
  سلفژ: ["پوزولی", "فونتن"],
};

function emptyCustomTitles(): Record<Axis, string[]> {
  return { تکنیک: [], "تئوری موسیقی": [], قطعه: [], سلفژ: [] };
}

function readCustomTitles(): Record<Axis, string[]> {
  const fallback = emptyCustomTitles();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(TITLES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<Axis, unknown>>;
    for (const axis of AXES) {
      const list = parsed[axis];
      if (!Array.isArray(list)) continue;
      fallback[axis] = list
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    return emptyCustomTitles();
  }
  return fallback;
}

function uniqueTitles(...groups: string[][]) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const group of groups) {
    for (const item of group) {
      const value = item.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      list.push(value);
    }
  }
  return list;
}

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
  const [customTitles, setCustomTitles] = useState<Record<Axis, string[]>>(
    emptyCustomTitles,
  );
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);
  const [addingTitle, setAddingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCustomTitles(readCustomTitles());
  }, []);

  const currentAttendance = useMemo(
    () => (session?.attendance as AttendanceStatus | null) ?? null,
    [session],
  );

  const nextAssignments = assignments.filter(
    (item) => item.sessionId === homeworkSession?.id,
  );

  const titleOptions = useMemo(
    () =>
      uniqueTitles(
        DEFAULT_TITLES[category],
        customTitles[category],
        assignments
          .filter((item) => item.category === category)
          .map((item) => item.title),
      ),
    [assignments, category, customTitles],
  );

  const persistCustomTitle = (axis: Axis, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCustomTitles((current) => {
      const next = {
        ...current,
        [axis]: uniqueTitles(current[axis] ?? [], [trimmed]),
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TITLES_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    setTitle(trimmed);
    setAddingTitle(false);
    setNewTitle("");
    setTitleMenuOpen(false);
  };

  const selectAxis = (axis: Axis) => {
    setCategory(axis);
    setSource("");
    setNewTitle("");
    setAddingTitle(false);
    setError(null);
    setTitle("");
    setTitleMenuOpen(axis !== "قطعه" && DEFAULT_TITLES[axis].length > 0);
  };

  const chooseTitle = (value: string) => {
    if (value === EMPTY_TITLE_VALUE) return;
    if (value === ADD_TITLE_VALUE) {
      setAddingTitle(true);
      setTitle("");
      setTitleMenuOpen(false);
      return;
    }
    setTitle(value);
    setAddingTitle(false);
    setNewTitle("");
  };

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
        source: category === "قطعه" ? undefined : source.trim() || undefined,
        dueLabel: homeworkSession
          ? `جلسه ${homeworkSession.number}`
          : "کلاس بعد",
        forNextSession: Boolean(nextSession),
      });
    },
    onSuccess: async () => {
      setTitle("");
      setSource("");
      setAddingTitle(false);
      setNewTitle("");
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
            hint={
              category === "قطعه"
                ? "نام قطعه را در کادر بنویسید. نمره اجرا جلسه بعد ثبت می‌شود."
                : "عنوان را از فهرست انتخاب کنید. استاد فقط منبع را وارد می‌کند، مثلاً درس ۴. نمره اجرا جلسه بعد ثبت می‌شود."
            }
          >
          <div>
            <Label className="mb-1.5 block">محور</Label>
            <div className="flex flex-wrap gap-1.5">
              {AXES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectAxis(item)}
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
            <Label className="mb-1.5 block">
              {category === "قطعه" ? "نام قطعه" : "عنوان تمرین"}
            </Label>
            {category === "قطعه" ? (
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="نام قطعه را بنویسید"
                autoFocus
              />
            ) : (
              <>
                <Select
                  value={title || EMPTY_TITLE_VALUE}
                  open={titleMenuOpen}
                  onOpenChange={setTitleMenuOpen}
                  onValueChange={chooseTitle}
                >
                  <SelectTrigger
                    className={cn(!title && "text-muted-foreground")}
                  >
                    <SelectValue placeholder="انتخاب عنوان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_TITLE_VALUE} className="hidden">
                      انتخاب عنوان
                    </SelectItem>
                    {titleOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                    {titleOptions.length > 0 ? <SelectSeparator /> : null}
                    <SelectItem value={ADD_TITLE_VALUE}>
                      <span className="inline-flex items-center gap-1.5">
                        <Plus className="size-3.5" />
                        افزودن عنوان جدید
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {addingTitle ? (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      placeholder="عنوان جدید را بنویسید"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          persistCustomTitle(category, newTitle);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!newTitle.trim()}
                      onClick={() => persistCustomTitle(category, newTitle)}
                    >
                      افزودن
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
          {category === "قطعه" ? null : (
            <div>
              <Label className="mb-1.5 block">منبع</Label>
              <Input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="مثلاً درس ۴"
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={
              create.isPending ||
              !title.trim() ||
              (category !== "قطعه" && !source.trim())
            }
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
