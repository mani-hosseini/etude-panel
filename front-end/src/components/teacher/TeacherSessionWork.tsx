"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";

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
import { ApiError } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import {
  studioApi,
  type StudioAssignment,
  type StudioStudentSession,
} from "@/lib/api/studio";
import { studioKeys } from "@/lib/api/studio-queries";
import { toFa, toLatinDigits } from "@/lib/format";
import { teacherSessionStatus } from "@/lib/session-access";
import { assignmentsForSession } from "@/lib/teacher-studio";
import { announceSaved } from "@/lib/save-feedback";
import { cn } from "@/lib/utils";

const CLASS_MARKS = [
  { id: "present", label: "کلاس تشکیل شد" },
  { id: "absent", label: "کلاس تشکیل نشد" },
] as const;

const AXES = ["تکنیک", "تئوری موسیقی", "قطعه", "سلفژ"] as const;
type Axis = (typeof AXES)[number];
type LessonField = { id: string; value: string };
type Draft = { id: string; title: string; lessons: LessonField[] };
type Drafts = Record<Axis, Draft[]>;
const MAX_ROWS = 6;
const MAX_LESSONS = 8;

const TITLES_STORAGE_KEY = "etude-exercise-titles-v1";
const LAST_TITLES_KEY = "etude-last-exercise-titles-v1";

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

function emptyLastTitles(): Record<Axis, string> {
  return { تکنیک: "", "تئوری موسیقی": "", قطعه: "", سلفژ: "" };
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

function readLastTitles(): Record<Axis, string> {
  const fallback = emptyLastTitles();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(LAST_TITLES_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<Axis, unknown>>;
    for (const axis of AXES) {
      const value = parsed[axis];
      if (typeof value === "string" && value.trim()) {
        fallback[axis] = value.trim();
      }
    }
  } catch {
    return emptyLastTitles();
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

function defaultTitleFor(
  axis: Axis,
  lastTitles: Record<Axis, string>,
  options: string[],
) {
  if (axis === "قطعه") return "";
  const remembered = lastTitles[axis]?.trim();
  if (remembered && options.includes(remembered)) return remembered;
  return options[0] ?? "";
}

function newRowId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeLesson(value = ""): LessonField {
  return { id: newRowId(), value };
}

function makeDraft(title = "", lessons?: string[]): Draft {
  const values = lessons && lessons.length > 0 ? lessons : [""];
  return {
    id: newRowId(),
    title,
    lessons: values.map((value) => makeLesson(value)),
  };
}

function initialDrafts(): Drafts {
  const last = readLastTitles();
  const custom = readCustomTitles();
  const drafts = emptyCustomTitles() as unknown as Drafts;
  for (const axis of AXES) {
    const options = uniqueTitles(DEFAULT_TITLES[axis], custom[axis]);
    drafts[axis] = [
      makeDraft(defaultTitleFor(axis, last, options)),
    ];
  }
  return drafts;
}

function lessonToken(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const latin = toLatinDigits(trimmed).replace(/\s/g, "");
  if (/^\d+$/.test(latin)) return latin;
  const prefixed = latin.match(/^(?:درس|lesson)\s*(\d+)$/i);
  if (prefixed?.[1]) return prefixed[1];
  return trimmed;
}

function formatLessons(values: string[]) {
  const numbers: string[] = [];
  const texts: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const token = lessonToken(value);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    if (/^\d+$/.test(token)) numbers.push(token);
    else texts.push(token);
  }
  const lesson = numbers.length > 0 ? `درس ${numbers.join("، ")}` : "";
  const source = [lesson, ...texts].filter(Boolean).join(" · ");
  return {
    source: source || undefined,
    sources: [...numbers, ...texts],
  };
}

function collectItems(drafts: Drafts) {
  const items: Array<{
    category: Axis;
    title: string;
    source?: string;
    sources?: string[];
  }> = [];
  for (const axis of AXES) {
    for (const row of drafts[axis]) {
      const title = row.title.trim();
      if (axis === "قطعه") {
        if (title) items.push({ category: axis, title });
        continue;
      }
      const formatted = formatLessons(
        Array.isArray(row.lessons) ? row.lessons.map((item) => item.value) : [],
      );
      if (title && formatted.source) {
        items.push({
          category: axis,
          title,
          source: formatted.source,
          sources: formatted.sources,
        });
      }
    }
  }
  return items;
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
  term,
  onSessionIdChange,
  onLastSessionSaved,
}: {
  studentId: string;
  sessions: StudioStudentSession[];
  assignments: StudioAssignment[];
  sessionId: string;
  term?: number;
  onSessionIdChange: (id: string) => void;
  onLastSessionSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const session =
    sessions.find((item) => item.id === sessionId) ??
    (sessionId ? null : sessions[0] ?? null);
  const homeworkSession = session;

  const [drafts, setDrafts] = useState<Drafts>(initialDrafts);
  const [customTitles, setCustomTitles] = useState(readCustomTitles);
  const [addingBook, setAddingBook] = useState<{
    axis: Axis;
    rowId: string;
  } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentAttendance = useMemo(
    () => (session?.attendance as AttendanceStatus | null) ?? null,
    [session],
  );

  const sessionAssignments = assignmentsForSession(
    assignments,
    session,
    term,
  );
  const isLastSession = Boolean(
    session &&
      !sessions.some(
        (item) =>
          item.courseId === session.courseId &&
          item.number === session.number + 1,
      ),
  );

  const titleOptionsFor = (axis: Axis) =>
    uniqueTitles(
      DEFAULT_TITLES[axis],
      customTitles[axis],
      assignments
        .filter((item) => item.category === axis)
        .map((item) => item.title),
    );

  const patchDraft = (axis: Axis, rowId: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [axis]: current[axis].map((row) =>
        row.id === rowId ? { ...row, ...patch } : row,
      ),
    }));
  };

  const addDraft = (axis: Axis) => {
    setDrafts((current) => {
      if (current[axis].length >= MAX_ROWS) return current;
      return {
        ...current,
        [axis]: [...current[axis], makeDraft("")],
      };
    });
  };

  const addLesson = (axis: Axis, rowId: string) => {
    setDrafts((current) => ({
      ...current,
      [axis]: current[axis].map((row) =>
        row.id === rowId && row.lessons.length < MAX_LESSONS
          ? { ...row, lessons: [...row.lessons, makeLesson()] }
          : row,
      ),
    }));
  };

  const patchLesson = (axis: Axis, rowId: string, lessonId: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [axis]: current[axis].map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              lessons: row.lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, value } : lesson,
              ),
            },
      ),
    }));
  };

  const removeLesson = (axis: Axis, rowId: string, lessonId: string) => {
    setDrafts((current) => ({
      ...current,
      [axis]: current[axis].map((row) => {
        if (row.id !== rowId) return row;
        if (row.lessons.length <= 1) {
          return { ...row, lessons: [makeLesson()] };
        }
        return {
          ...row,
          lessons: row.lessons.filter((lesson) => lesson.id !== lessonId),
        };
      }),
    }));
  };

  const removeDraft = (axis: Axis, rowId: string) => {
    setDrafts((current) => {
      if (current[axis].length <= 1) {
        return {
          ...current,
          [axis]: [
            makeDraft(axis === "قطعه" ? "" : current[axis][0]?.title ?? ""),
          ],
        };
      }
      return {
        ...current,
        [axis]: current[axis].filter((row) => row.id !== rowId),
      };
    });
    setAddingBook((current) =>
      current?.axis === axis && current.rowId === rowId ? null : current,
    );
  };

  const rememberTitle = (axis: Axis, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = { ...readLastTitles(), [axis]: trimmed };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_TITLES_KEY, JSON.stringify(next));
    }
  };

  const persistCustomTitle = (axis: Axis, rowId: string, value: string) => {
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
    patchDraft(axis, rowId, { title: trimmed });
    rememberTitle(axis, trimmed);
    setAddingBook(null);
    setNewTitle("");
  };

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: studioKeys.student(studentId) }),
      queryClient.invalidateQueries({ queryKey: studioKeys.assignments }),
      queryClient.invalidateQueries({ queryKey: studioKeys.overview }),
      queryClient.invalidateQueries({ queryKey: studioKeys.today }),
    ]);

  const stay = (text: string) => {
    setError(null);
    setMessage(text);
    announceSaved(text, { scroll: false });
  };

  const mark = useMutation({
    mutationFn: (attendance: AttendanceStatus) => {
      if (!session) throw new Error("جلسه‌ای انتخاب نشده");
      return studioApi.saveSessionWork(session.id, {
        studentId,
        attendance,
        ...(term != null ? { term } : {}),
      });
    },
    onSuccess: async (_result, attendance) => {
      if (session) onSessionIdChange(session.id);
      stay(
        attendance === "absent"
          ? "کلاس تشکیل نشد. جلسه برای هنرجو باز می‌شود و پیام غیبت را می‌بیند؛ تکلیفی داده نمی‌شود."
          : "کلاس تشکیل شد و این جلسه برای هنرجو باز شد.",
      );
      await refresh();
    },
    onError: (err) => {
      setMessage(null);
      setError(audienceError(err, "ثبت حضور انجام نشد."));
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("جلسه‌ای انتخاب نشده");
      const items = collectItems(drafts);
      if (items.length === 0) {
        throw new Error("حداقل یک تمرین را کامل کنید.");
      }
      const payload = {
        courseId: session.courseId,
        sessionId: session.id,
        studentIds: [studentId],
        dueLabel: session ? `جلسه ${session.number}` : "کلاس بعد",
        forNextSession: false,
        ...(term != null ? { term } : {}),
        items: items.map(({ category, title, source, sources }) => ({
          category,
          title,
          source,
          sources,
        })),
      };
      const sourceOnlyItems = payload.items.map(
        ({ sources: _sources, ...item }) => item,
      );
      let created: { saved: number; assignments: unknown[] };
      try {
        created = await studioApi.createAssignments(payload);
      } catch (err) {
        if (
          !(err instanceof ApiError) ||
          (err.status !== 404 && err.status !== 405 && err.status !== 400)
        ) {
          throw err;
        }
        try {
          created = await studioApi.createAssignments({
            ...payload,
            items: sourceOnlyItems,
          });
        } catch (retryErr) {
          if (
            !(retryErr instanceof ApiError) ||
            (retryErr.status !== 404 &&
              retryErr.status !== 405 &&
              retryErr.status !== 400)
          ) {
            throw retryErr;
          }
          const assignments = [];
          for (const item of sourceOnlyItems) {
            assignments.push(
              await studioApi.createAssignment({
                courseId: payload.courseId,
                sessionId: payload.sessionId,
                studentIds: payload.studentIds,
                dueLabel: payload.dueLabel,
                forNextSession: payload.forNextSession,
                term: payload.term,
                category: item.category,
                title: item.title,
                source: item.source,
              }),
            );
          }
          created = { saved: assignments.length, assignments };
        }
      }
      try {
        await studioApi.confirmSession(studentId, session.id);
      } catch {
        /* homework already saved; confirm is implied */
      }
      return created;
    },
    onSuccess: async (result) => {
      if (session && !isLastSession) onSessionIdChange(session.id);
      for (const axis of AXES) {
        if (axis === "قطعه") continue;
        const kept = drafts[axis].find((row) => row.title.trim())?.title;
        if (kept) rememberTitle(axis, kept);
      }
      setDrafts((current) => {
        const next = { ...current };
        for (const axis of AXES) {
          const keptTitle =
            axis === "قطعه"
              ? ""
              : current[axis].find((row) => row.title.trim())?.title ?? "";
          next[axis] = [makeDraft(keptTitle)];
        }
        return next;
      });
      setAddingBook(null);
      setNewTitle("");
      const targetNumber = homeworkSession?.number ?? session?.number ?? 0;
      stay(
        result.saved > 1
          ? `${toFa(result.saved)} تمرین جلسه ${toFa(targetNumber)} ثبت شد.`
          : `تمرین جلسه ${toFa(targetNumber)} ثبت شد.`,
      );
      await refresh();
      if (isLastSession) onLastSessionSaved?.();
    },
    onError: (err) => {
      setMessage(null);
      setError(
        err instanceof Error && err.message === "حداقل یک تمرین را کامل کنید."
          ? err.message
          : audienceError(err, "ثبت تمرین انجام نشد."),
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => studioApi.deleteAssignment(id),
    onSuccess: async () => {
      announceSaved("تمرین حذف شد.", { scroll: false });
      await refresh();
    },
  });

  const pendingItems = collectItems(drafts);
  const canSubmit = pendingItems.length > 0 && !create.isPending;

  if (sessions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        برای این هنرجو جلسه‌ای در کلاس‌های شما نیست.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <WorkBlock
        title="جلسه و تشکیل کلاس"
        hint="اگر کلاس تشکیل شد همان جلسه برای همین هنرجو باز می‌شود."
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
              {sessions.map((item) => {
                const access = teacherSessionStatus(item.attendance);
                return (
                  <SelectItem key={item.id} value={item.id}>
                    {`جلسه ${toFa(item.number)}${item.title ? ` — ${item.title}` : ""}${item.current ? " · جاری" : ""}${item.confirmed ? " · تأییدشده" : ""} · ${statusLabel[access]}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {session ? (
          <p className="text-xs text-muted-foreground">
            {session.courseTitle} ·{" "}
            {statusLabel[teacherSessionStatus(session.attendance)]}
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
        <div className="space-y-3">
          <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-6 text-rose-700">
            کلاس تشکیل نشد. جلسه برای هنرجو باز می‌شود و پیام غیبت را می‌بیند؛
            تکلیفی به او داده نمی‌شود.
          </p>
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
        </div>
      ) : (
        <WorkBlock
          title={
            session
              ? `تمرین این جلسه · جلسه ${toFa(session.number)}`
              : "تمرین این جلسه"
          }
          hint={
            isLastSession
              ? "برای هر محور چند تمرین یا قطعه بدهید و یک‌بار ثبت کنید. با ثبت تکلیف آخرین جلسه، ترم بعد باز می‌شود."
              : "کنار درس + بزنید تا شماره درس همان کتاب اضافه شود. + تمرین یک عنوان تازه باز می‌کند. یک‌بار ثبت کافی است."
          }
        >
          {sessionAssignments.length > 0 ? (
            <ul className="space-y-2">
              {sessionAssignments.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy">
                      {item.title}
                      {item.source ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {item.source}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <button
                      type="button"
                      onClick={() => remove.mutate(item.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit) create.mutate();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {AXES.map((axis) => {
                const rows = drafts[axis];
                const options = titleOptionsFor(axis);
                const canAdd = rows.length < MAX_ROWS;
                return (
                  <div
                    key={axis}
                    className={cn(
                      "space-y-2 rounded-2xl border border-border/80 p-3",
                      axis === "قطعه" && "sm:col-span-2",
                    )}
                  >
                    <p className="text-xs font-semibold text-navy">{axis}</p>
                    <div className="space-y-3">
                      {rows.map((row, index) => {
                        const lessons =
                          Array.isArray(row.lessons) && row.lessons.length > 0
                            ? row.lessons
                            : [{ id: `${row.id}-lesson`, value: "" }];
                        return (
                        <div
                          key={row.id}
                          className={cn(
                            "space-y-2",
                            index > 0 && "border-t border-dashed border-border/80 pt-3",
                          )}
                        >
                          {axis === "قطعه" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={row.title}
                                onChange={(event) =>
                                  patchDraft(axis, row.id, {
                                    title: event.target.value,
                                  })
                                }
                                placeholder={
                                  index === 0 ? "نام قطعه" : "قطعه بعدی"
                                }
                              />
                              {rows.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeDraft(axis, row.id)}
                                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground ring-1 ring-border hover:text-destructive"
                                  aria-label="حذف قطعه"
                                >
                                  <Minus className="size-4" />
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-1.5">
                                {options.map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                      patchDraft(axis, row.id, { title: item });
                                      rememberTitle(axis, item);
                                      setAddingBook(null);
                                    }}
                                    className={cn(
                                      "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition",
                                      row.title === item
                                        ? "bg-brand-50 text-navy ring-brand"
                                        : "bg-white text-muted-foreground ring-border hover:text-navy",
                                    )}
                                  >
                                    {item}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddingBook((current) =>
                                      current?.axis === axis &&
                                      current.rowId === row.id
                                        ? null
                                        : { axis, rowId: row.id },
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-dashed ring-border hover:text-navy"
                                >
                                  <Plus className="size-3" />
                                  جدید
                                </button>
                              </div>
                              {addingBook?.axis === axis &&
                              addingBook.rowId === row.id ? (
                                <div className="flex gap-2">
                                  <Input
                                    value={newTitle}
                                    onChange={(event) =>
                                      setNewTitle(event.target.value)
                                    }
                                    placeholder="عنوان جدید"
                                    autoFocus
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        persistCustomTitle(
                                          axis,
                                          row.id,
                                          newTitle,
                                        );
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    disabled={!newTitle.trim()}
                                    onClick={() =>
                                      persistCustomTitle(
                                        axis,
                                        row.id,
                                        newTitle,
                                      )
                                    }
                                  >
                                    افزودن
                                  </Button>
                                </div>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="shrink-0 text-sm font-medium text-navy">
                                  درس
                                </span>
                                {lessons.map((lesson, lessonIndex) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center gap-1"
                                  >
                                    <Input
                                      value={lesson.value}
                                      onChange={(event) =>
                                        patchLesson(
                                          axis,
                                          row.id,
                                          lesson.id,
                                          event.target.value,
                                        )
                                      }
                                      inputMode="numeric"
                                      placeholder={lessonIndex === 0 ? "۴" : ""}
                                      className="h-11 w-16 text-center text-base"
                                      autoComplete="off"
                                    />
                                    {lessons.length > 1 ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeLesson(axis, row.id, lesson.id)
                                        }
                                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground ring-1 ring-border hover:text-destructive"
                                        aria-label="حذف درس"
                                      >
                                        <Minus className="size-4" />
                                      </button>
                                    ) : null}
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  disabled={lessons.length >= MAX_LESSONS}
                                  onClick={() => addLesson(axis, row.id)}
                                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-navy ring-1 ring-border hover:bg-brand-50 disabled:opacity-40"
                                  aria-label="افزودن درس"
                                >
                                  <Plus className="size-4" />
                                </button>
                                {rows.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => removeDraft(axis, row.id)}
                                    className="text-[11px] text-muted-foreground hover:text-destructive"
                                  >
                                    حذف تمرین
                                  </button>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={!canAdd}
                      onClick={() => addDraft(axis)}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-navy ring-1 ring-dashed ring-brand/40 hover:bg-brand-50 disabled:opacity-40"
                    >
                      <Plus className="size-3" />
                      {axis === "قطعه" ? "قطعه" : "تمرین"}
                    </button>
                  </div>
                );
              })}
            </div>

            {error ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button type="submit" disabled={!canSubmit}>
                {create.isPending
                  ? "در حال ثبت…"
                  : pendingItems.length > 1
                    ? `ثبت ${toFa(pendingItems.length)} تمرین`
                    : session
                      ? `ثبت تمرین جلسه ${toFa(session.number)}`
                      : "ثبت تمرین"}
              </Button>
            </div>
          </form>
        </WorkBlock>
      )}
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
