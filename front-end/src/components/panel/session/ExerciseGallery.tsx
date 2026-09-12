"use client";

import { useState } from "react";
import { Download, FileText, Images, NotebookPen } from "lucide-react";

import { ExamImageLightbox } from "@/components/exams/ExamImageLightbox";
import { RemoteImg } from "@/components/media/remote-img";
import { resolveMediaUrl } from "@/lib/api/http";
import type { SessionExercise } from "@/lib/api/types";
import { formatBytes, toFa } from "@/lib/format";
import { isPdfFile } from "@/lib/media";
import { cn } from "@/lib/utils";

type ExerciseGalleryProps = {
  exercises: SessionExercise[];
  sessionLabel: string;
  className?: string;
};

export function ExerciseGallery({
  exercises,
  sessionLabel,
  className,
}: ExerciseGalleryProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

  return (
    <div className={cn("bg-background p-4 sm:p-6", className)}>
      <div className="mb-4 text-right">
        <p className="text-xs font-semibold text-brand">{sessionLabel}</p>
        <h2 className="mt-1 text-lg font-bold text-navy">تمارین جلسه</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          عکس‌ها را ببینید و فایل‌های PDF را دانلود کنید.
        </p>
      </div>

      {exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand">
            <NotebookPen className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            هنوز تمرینی برای این جلسه گذاشته نشده است.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {exercises.map((item, index) => {
            const src = resolveMediaUrl(item.path);
            const title = item.caption || item.filename || `تمرین ${toFa(index + 1)}`;
            const pdf = isPdfFile(item.mimeType, item.filename);

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft"
              >
                {pdf ? (
                  <div className="flex min-h-52 flex-col items-center justify-center gap-3 bg-slate-50 px-5 py-8 text-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand">
                      <FileText className="size-7" />
                    </span>
                    <div>
                      <p className="font-semibold text-navy">{title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF · {formatBytes(item.size)}
                      </p>
                    </div>
                    {src ? (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-soft"
                        >
                          مشاهده
                        </a>
                        <a
                          href={src}
                          download={item.filename}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
                        >
                          <Download className="size-3.5" />
                          دانلود
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="block w-full text-right"
                    onClick={() => {
                      if (src) setLightbox({ src, alt: title });
                    }}
                  >
                    <div className="relative flex min-h-52 items-center justify-center bg-slate-50">
                      {src ? (
                        <RemoteImg
                          src={src}
                          alt={title}
                          className="max-h-72 w-full object-contain"
                          fallback={
                            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                              <Images className="size-6 text-slate-300" />
                              <p className="text-xs text-muted-foreground">
                                تصویر تمرین پیدا نشد.
                              </p>
                            </div>
                          }
                        />
                      ) : (
                        <Images className="size-6 text-slate-300" />
                      )}
                    </div>
                    <div className="border-t border-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-navy">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        عکس · {formatBytes(item.size)} · تمرین {toFa(index + 1)}
                      </p>
                    </div>
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {lightbox ? (
        <ExamImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
