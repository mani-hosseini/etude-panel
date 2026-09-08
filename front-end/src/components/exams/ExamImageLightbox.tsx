"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { RemoteImg } from "@/components/media/remote-img";

type ExamImageLightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

export function ExamImageLightbox({ src, alt, onClose }: ExamImageLightboxProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="بستن تصویر"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-full w-full max-w-5xl flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 left-0 z-20 inline-flex size-10 items-center justify-center rounded-xl bg-white text-slate-800 shadow-lg"
          aria-label="بستن"
        >
          <X className="size-5" />
        </button>
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <RemoteImg
            src={src}
            alt={alt}
            className="max-h-[min(88dvh,900px)] w-full object-contain bg-slate-100"
            fallback={
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                تصویر بارگذاری نشد.
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
