"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, UserPlus } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JalaliDateField } from "@/components/ui/jalali-date-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  adminApi,
  type AdminPanelTask,
} from "@/lib/api/admin-client";
import { adminQueryKeys, useAdminTasksQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { formatJalali } from "@/lib/jalali";
import { adminRoutes } from "@/lib/routes";
import { announceSaved } from "@/lib/save-feedback";
import { toFa } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "open" | "enroll" | "done";

export function AdminTasksPage() {
  const queryClient = useQueryClient();
  const tasksQuery = useAdminTasksQuery();
  const tasks = tasksQuery.data?.tasks ?? [];
  const searchParams = useSearchParams();
  const focusLead = searchParams.get("lead");
  const [tab, setTab] = useState<Tab>("open");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [composer, setComposer] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.tasks });

  const createTask = useMutation({
    mutationFn: () =>
      adminApi.createTask({
        title: title.trim(),
        body: body.trim() || undefined,
        dueDate: dueDate || undefined,
      }),
    onSuccess: async () => {
      await invalidate();
      setTitle("");
      setBody("");
      setDueDate("");
      setComposer(false);
      announceSaved("تسک برای CRM ساخته شد.", { scroll: false });
    },
  });

  const toggleDone = useMutation({
    mutationFn: (task: AdminPanelTask) =>
      adminApi.updateTask(task.id, {
        status: task.status === "done" ? "open" : "done",
      }),
    onSuccess: () => invalidate(),
  });

  const removeTask = useMutation({
    mutationFn: (id: string) => adminApi.deleteTask(id),
    onSuccess: () => invalidate(),
  });

  const focused = useMemo(
    () =>
      focusLead
        ? tasks.find((task) => task.kind === "enrollment" && task.leadId === focusLead)
        : undefined,
    [tasks, focusLead],
  );

  const grouped = useMemo(() => {
    const open = tasks.filter((task) => task.status === "open");
    return {
      open,
      enroll: open.filter((task) => task.kind === "enrollment"),
      done: tasks.filter((task) => task.status === "done"),
    };
  }, [tasks]);

  const visible =
    tab === "enroll" ? grouped.enroll : tab === "done" ? grouped.done : grouped.open;

  useEffect(() => {
    if (!focused) return;
    setTab(focused.status === "done" ? "done" : "open");
    const timer = window.setTimeout(() => {
      document
        .getElementById(`task-${focused.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [focused]);

  if (tasksQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  if (tasksQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {audienceError(tasksQuery.error, "تسک‌ها الان در دسترس نیست.")}
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || createTask.isPending) return;
    createTask.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">تسک‌ها</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            مدیر کار می‌سازد؛ CRM انجام می‌دهد. ثبت‌نام‌شده‌ها خودشان اینجا می‌آیند.
          </p>
        </div>
        <Button onClick={() => setComposer((v) => !v)} className="rounded-xl">
          <Plus className="size-4" />
          تسک CRM
        </Button>
      </div>

      {composer ? (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً پیگیری قرارداد تبلیغات"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <JalaliDateField
              value={dueDate}
              onChange={setDueDate}
              placeholder="مهلت — اختیاری"
              allowEmpty
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              placeholder="توضیح کوتاه برای CRM"
              className="min-h-12"
            />
          </div>
          {createTask.isError ? (
            <p className="text-sm text-rose-600">
              {audienceError(createTask.error, "ثبت تسک انجام نشد.")}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setComposer(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              ثبت تسک
            </Button>
          </div>
        </form>
      ) : null}

      <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
        {(
          [
            ["open", "باز", grouped.open.length],
            ["enroll", "ثبت در سایت", grouped.enroll.length],
            ["done", "انجام‌شده", grouped.done.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition",
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            )}
          >
            {label}
            <span className="ms-1 tabular-nums text-slate-400">{toFa(count)}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">
            {tab === "enroll"
              ? "هنوز کسی ثبت‌نام نشده."
              : tab === "done"
                ? "هنوز تسکی انجام نشده."
                : "تسک بازی نیست."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {tab === "enroll"
              ? "وقتی در ثبت‌نام وضعیت «ثبت‌نام شد» شود، اینجا ظاهر می‌شود."
              : "از دکمه بالا یک کار برای CRM بساز."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              focused={focused?.id === task.id}
              onToggle={() => toggleDone.mutate(task)}
              onRemove={() => removeTask.mutate(task.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  focused,
  onToggle,
  onRemove,
}: {
  task: AdminPanelTask;
  focused?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const done = task.status === "done";
  const leadHref =
    task.kind === "enrollment" && task.leadId
      ? adminRoutes.registrationLead(task.leadId)
      : null;

  return (
    <li
      id={`task-${task.id}`}
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-white p-4 transition",
        focused ? "border-brand ring-2 ring-brand/20" : "border-slate-200",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border transition",
          done
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-transparent hover:border-brand/40",
        )}
        aria-label={done ? "باز کردن دوباره" : "انجام شد"}
      >
        <Check className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {leadHref ? (
            <Link
              href={leadHref}
              className={cn(
                "text-sm font-semibold text-slate-900 hover:text-brand hover:underline",
                done && "text-slate-400 line-through",
              )}
            >
              {task.title}
            </Link>
          ) : (
            <p
              className={cn(
                "text-sm font-semibold text-slate-900",
                done && "text-slate-400 line-through",
              )}
            >
              {task.title}
            </p>
          )}
          {task.kind === "enrollment" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              <UserPlus className="size-3" />
              ثبت در سایت
            </span>
          ) : (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              از مدیر
            </span>
          )}
        </div>
        {task.body ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{task.body}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
          {task.phone ? (
            <a href={`tel:${task.phone}`} className="hover:text-brand" dir="ltr">
              {task.phone}
            </a>
          ) : null}
          {task.dueDate ? <span>مهلت {formatJalali(task.dueDate)}</span> : null}
          {leadHref ? (
            <Link href={leadHref} className="font-medium text-brand hover:underline">
              پرونده ثبت‌نام
            </Link>
          ) : null}
        </div>
      </div>
      <AdminConfirmDelete
        title="حذف این تسک؟"
        description="از فهرست CRM برداشته می‌شود."
        onConfirm={onRemove}
      />
    </li>
  );
}
