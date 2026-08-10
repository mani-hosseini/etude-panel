"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { type SlideFormState } from "@/components/admin/course/SlideEditorForm";
import { SlideList } from "@/components/admin/course/SlideList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminApi,
  type AdminSlide,
  type AdminSlideTerm,
} from "@/lib/api/admin-client";
import {
  adminQueryKeys,
  useAdminCourseQuery,
  useAdminSlidesQuery,
} from "@/lib/api/admin-queries";
import { ApiError } from "@/lib/api/http";
import { toFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";

const emptySlide: SlideFormState = {
  chapter: "۱",
  title: "",
  goal: "",
  body: "",
  bulletsText: "",
  mistakesText: "",
  termsText: "",
  imageHint: "",
  imageId: "",
  funFact: "",
  kind: "LESSON",
};

function parseLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTerms(text: string): AdminSlideTerm[] {
  return parseLines(text)
    .map((line) => {
      const [en, fa] = line.split("|").map((p) => p.trim());
      if (!en || !fa) return null;
      return { en, fa };
    })
    .filter((t): t is AdminSlideTerm => Boolean(t));
}

function termsToText(terms: AdminSlide["terms"]) {
  if (!Array.isArray(terms)) return "";
  return terms
    .map((t) => {
      if (!t || typeof t !== "object") return "";
      const row = t as AdminSlideTerm;
      if (!row.en || !row.fa) return "";
      return `${row.en} | ${row.fa}`;
    })
    .filter(Boolean)
    .join("\n");
}

function slideToForm(slide: AdminSlide): SlideFormState {
  return {
    chapter: slide.chapter,
    title: slide.title,
    goal: slide.goal,
    body: slide.body,
    bulletsText: slide.bullets.join("\n"),
    mistakesText: slide.mistakes.join("\n"),
    termsText: termsToText(slide.terms),
    imageHint: slide.imageHint ?? "",
    imageId: slide.imageId ?? "",
    funFact: slide.funFact ?? "",
    kind: slide.kind,
  };
}

function formToPayload(form: SlideFormState) {
  const isVisual = form.kind === "VISUAL";
  return {
    chapter: form.chapter,
    title: form.title,
    goal: form.goal,
    body: form.body || (isVisual ? form.imageHint || form.title : form.body),
    bullets: parseLines(form.bulletsText),
    mistakes: parseLines(form.mistakesText),
    terms: parseTerms(form.termsText),
    // عکس فقط برای اسلاید تصویری ذخیره می‌شود
    imageHint: isVisual ? form.imageHint || undefined : "",
    imageId: isVisual ? form.imageId || undefined : "",
    funFact: form.funFact || undefined,
    kind: form.kind,
  };
}

export function AdminSessionSlidesPage({
  courseSlug,
  sessionNumber,
}: {
  courseSlug: string;
  sessionNumber: number;
}) {
  const queryClient = useQueryClient();
  const courseQuery = useAdminCourseQuery(courseSlug);
  const session = useMemo(
    () =>
      courseQuery.data?.sessions.find((s) => s.number === sessionNumber) ??
      null,
    [courseQuery.data, sessionNumber],
  );
  const sessionId = session?.id ?? "";
  const courseId = courseQuery.data?.id ?? "";
  const slidesQuery = useAdminSlidesQuery(sessionId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SlideFormState>(emptySlide);
  const [error, setError] = useState<string | null>(null);

  const invalidate = async () => {
    if (sessionId) {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.slides(sessionId),
      });
    }
    await queryClient.invalidateQueries({
      queryKey: adminQueryKeys.course(courseSlug),
    });
    if (courseId && courseId !== courseSlug) {
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.course(courseId),
      });
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (editingId) return adminApi.updateSlide(editingId, payload);
      return adminApi.createSlide(sessionId, payload);
    },
    onSuccess: async () => {
      setCreating(false);
      setEditingId(null);
      setForm(emptySlide);
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "ذخیره اسلاید ناموفق بود.",
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteSlide(id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (slideIds: string[]) =>
      adminApi.reorderSlides(sessionId, slideIds),
    onSuccess: invalidate,
  });

  if (courseQuery.isPending) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {courseQuery.error instanceof ApiError
          ? courseQuery.error.message
          : "دوره یافت نشد"}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        جلسه شماره {toFa(sessionNumber)} در این دوره پیدا نشد.
      </div>
    );
  }

  if (slidesQuery.isPending) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  if (slidesQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        {slidesQuery.error instanceof ApiError
          ? slidesQuery.error.message
          : "خطا در دریافت اسلایدها"}
      </div>
    );
  }

  const slides = slidesQuery.data.slides;
  const slug = courseQuery.data.slug;

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const ids = slides.map((s) => s.id);
    const tmp = ids[index];
    ids[index] = ids[next];
    ids[next] = tmp;
    reorder.mutate(ids);
  };

  const openCreate = () => {
    setEditingId(null);
    setCreating(true);
    setForm(emptySlide);
    setError(null);
  };

  const openEdit = (slide: AdminSlide) => {
    setCreating(false);
    setEditingId(slide.id);
    setForm(slideToForm(slide));
    setError(null);
  };

  const closeEditor = () => {
    setCreating(false);
    setEditingId(null);
    setForm(emptySlide);
    setError(null);
  };

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <AdminPageHeader
        backHref={adminRoutes.course(slug)}
        backLabel="بازگشت به دوره"
        title={`محتوای جلسه ${toFa(session.number)}`}
        description={session.title || courseQuery.data.title}
        actions={
          <Button
            type="button"
            className="rounded-xl"
            onClick={openCreate}
            disabled={creating}
          >
            <Plus className="size-4" />
            اسلاید جدید
          </Button>
        }
      />

      <p className="text-sm text-slate-500">
        {toFa(slides.length)} اسلاید
      </p>

      <SlideList
        slides={slides}
        editingId={editingId}
        creating={creating}
        form={form}
        setForm={setForm}
        savePending={save.isPending}
        reorderPending={reorder.isPending}
        formError={error}
        onEdit={openEdit}
        onDelete={(id) => remove.mutate(id)}
        onMove={move}
        onSave={() => save.mutate()}
        onCloseEditor={closeEditor}
      />
    </div>
  );
}
