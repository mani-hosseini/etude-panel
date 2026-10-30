"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

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
type Draft = { title: string; source: string };
type Drafts = Record<Axis, Draft>;

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

function initialDrafts(): Drafts {
  const last = readLastTitles();
  const custom = readCustomTitles();
  const drafts = emptyLastTitles() as unknown as Drafts;
  for (const axis of AXES) {
    const options = uniqueTitles(DEFAULT_TITLES[axis], custom[axis]);
    drafts[axis] = {
      title: defaultTitleFor(axis, last, options),
      source: "",
    };
  }
  return drafts;
}

function formatLessonSource(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const latin = toLatinDigits(trimmed).replace(/\s/g, "");
  if (/^\d+$/.test(latin)) return `درس ${latin}`;
  const prefixed = latin.match(/^(?:درس|lesson)\s*(\d+)$/i);
  if (prefixed?.[1]) return `درس ${prefixed[1]}`;
  return trimmed;
}

function collectItems(drafts: Drafts) {
  const items: Array<{ category: Axis; title: string; source?: string }> = [];
  for (const axis of AXES) {
    const title = drafts[axis].title.trim();
    if (axis === "قطعه") {
      if (title) items.push({ category: axis, title });
      continue;
    }
    const source = formatLessonSource(drafts[axis].source);
    if (title && source) items.push({ category: axis, title, source });
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
  const [addingAxis, setAddingAxis] = useState<Axis | null>(null);
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

  const patchDraft = (axis: Axis, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [axis]: { ...current[axis], ...patch },
    }));
  };

  const rememberTitle = (axis: Axis, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = { ...readLastTitles(), [axis]: trimmed };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_TITLES_KEY, JSON.stringify(next));
    }
  };

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
    patchDraft(axis, { title: trimmed });
    rememberTitle(axis, trimmed);
    setAddingAxis(null);
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
        items,
      };
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
        const assignments = [];
        for (const item of items) {
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
        if (axis !== "قطعه") rememberTitle(axis, drafts[axis].title);
      }
      setDrafts((current) => {
        const next = { ...current };
        for (const axis of AXES) {
          next[axis] =
            axis === "قطعه"
              ? { title: "", source: "" }
              : { ...current[axis], source: "" };
        }
        return next;
      });
      setAddingAxis(null);
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
              ? "محورها را پر کنید. با ثبت تکلیف آخرین جلسه، ترم بعد با همین تعداد جلسه باز می‌شود."
              : "محورها را پر کنید و یک‌بار ثبت بزنید. نمره این تمرین‌ها در جلسه بعد گرفته می‌شود."
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
                const draft = drafts[axis];
                const options = titleOptionsFor(axis);
                return (
                  <div
                    key={axis}
                    className={cn(
                      "space-y-2 rounded-2xl border border-border/80 p-3",
                      axis === "قطعه" && "sm:col-span-2",
                    )}
                  >
                    <p className="text-xs font-semibold text-navy">{axis}</p>
                    {axis === "قطعه" ? (
                      <Input
                        value={draft.title}
                        onChange={(event) =>
                          patchDraft(axis, { title: event.target.value })
                        }
                        placeholder="نام قطعه"
                      />
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {options.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                patchDraft(axis, { title: item });
                                rememberTitle(axis, item);
                                setAddingAxis(null);
                              }}
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition",
                                draft.title === item
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
                              setAddingAxis((current) =>
                                current === axis ? null : axis,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-dashed ring-border hover:text-navy"
                          >
                            <Plus className="size-3" />
                            جدید
                          </button>
                        </div>
                        {addingAxis === axis ? (
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
                                  persistCustomTitle(axis, newTitle);
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
                                persistCustomTitle(axis, newTitle)
                              }
                            >
                              افزودن
                            </Button>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-sm font-medium text-navy">
                            درس
                          </span>
                          <Input
                            value={draft.source}
                            onChange={(event) =>
                              patchDraft(axis, { source: event.target.value })
                            }
                            inputMode="numeric"
                            placeholder="۴"
                            className="h-11 max-w-28 text-center text-base"
                            autoComplete="off"
                          />
                        </div>
                      </>
                    )}
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
