"use client";

import { Loader2 } from "lucide-react";

import { SlideImageUpload } from "@/components/admin/course/SlideImageUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { SlideKind } from "@/lib/api/admin-client";
import { cn } from "@/lib/utils";

export type SlideFormState = {
  chapter: string;
  title: string;
  goal: string;
  body: string;
  bulletsText: string;
  mistakesText: string;
  termsText: string;
  imageHint: string;
  imageId: string;
  funFact: string;
  kind: SlideKind;
};

type SlideEditorFormProps = {
  form: SlideFormState;
  setForm: React.Dispatch<React.SetStateAction<SlideFormState>>;
  isEdit: boolean;
  pending?: boolean;
  error?: string | null;
  onSubmit: () => void;
  onClose: () => void;
};

export function SlideEditorForm({
  form,
  setForm,
  isEdit,
  pending,
  error,
  onSubmit,
  onClose,
}: SlideEditorFormProps) {
  const isVisual = form.kind === "VISUAL";
  const textDisabled = isVisual;
  const imageDisabled = !isVisual;

  const set =
    (key: keyof SlideFormState) =>
    (value: string) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          {isEdit ? "ویرایش اسلاید" : "اسلاید جدید"}
        </CardTitle>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          بستن
        </Button>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>فصل</Label>
              <Input
                required
                className="rounded-xl"
                value={form.chapter}
                onChange={(e) => set("chapter")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نوع</Label>
              <Select
                value={form.kind}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: value as SlideKind,
                    ...(value !== "VISUAL"
                      ? { imageId: "", imageHint: "" }
                      : {}),
                  }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COVER">جلد</SelectItem>
                  <SelectItem value="LESSON">درس (توضیحی)</SelectItem>
                  <SelectItem value="VISUAL">تصویری (فقط عکس)</SelectItem>
                  <SelectItem value="OUTRO">پایانی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>عنوان</Label>
              <Input
                required
                className="rounded-xl"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
              />
            </div>

            <fieldset
              disabled={textDisabled}
              className={cn(
                "contents",
                textDisabled && "[&_input]:opacity-50 [&_textarea]:opacity-50",
              )}
            >
              <div
                className={cn(
                  "space-y-3 sm:col-span-2",
                  textDisabled && "pointer-events-none opacity-45",
                )}
              >
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                  {textDisabled
                    ? "برای اسلاید تصویری، بخش توضیحات غیرفعال است. فقط عکس آپلود کنید."
                    : "محتوای توضیحی اسلاید"}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>هدف</Label>
                    <Input
                      className="rounded-xl"
                      value={form.goal}
                      onChange={(e) => set("goal")(e.target.value)}
                      disabled={textDisabled}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>متن اصلی</Label>
                    <Textarea
                      required={!isVisual}
                      rows={4}
                      value={form.body}
                      onChange={(e) => set("body")(e.target.value)}
                      disabled={textDisabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>نکات کلیدی (هر خط)</Label>
                    <Textarea
                      rows={4}
                      value={form.bulletsText}
                      onChange={(e) => set("bulletsText")(e.target.value)}
                      disabled={textDisabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>اشتباهات رایج (هر خط)</Label>
                    <Textarea
                      rows={4}
                      value={form.mistakesText}
                      onChange={(e) => set("mistakesText")(e.target.value)}
                      disabled={textDisabled}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>اصطلاحات (هر خط: انگلیسی | فارسی)</Label>
                    <Textarea
                      rows={3}
                      value={form.termsText}
                      onChange={(e) => set("termsText")(e.target.value)}
                      placeholder="Staff | خطوط حامل"
                      disabled={textDisabled}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>نکته جالب</Label>
                    <Input
                      className="rounded-xl"
                      value={form.funFact}
                      onChange={(e) => set("funFact")(e.target.value)}
                      disabled={textDisabled}
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <div
              className={cn(
                "sm:col-span-2",
                imageDisabled && "pointer-events-none opacity-45",
              )}
            >
              {!isVisual ? (
                <p className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                  آپلود عکس فقط برای نوع «تصویری» فعال است.
                </p>
              ) : null}
              <SlideImageUpload
                imageId={form.imageId}
                imageHint={form.imageHint}
                disabled={imageDisabled}
                onImageIdChange={(value) => set("imageId")(value)}
                onImageHintChange={(value) => set("imageHint")(value)}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                ذخیره…
              </>
            ) : (
              "ذخیره اسلاید"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
