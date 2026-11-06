"use client";

import { useState } from "react";
import { Phone, X } from "lucide-react";

import { LeadFields } from "@/components/admin/registration/LeadFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toFa } from "@/lib/format";
import {
  emptyLeadDraft,
  NOTE_TEMPLATES,
  type LeadDraft,
} from "@/lib/registration-pipeline";

type LeadComposerProps = {
  onClose: () => void;
  onCreate: (draft: LeadDraft, note: string) => void;
  busy?: boolean;
  error?: string | null;
};

export function LeadComposer({
  onClose,
  onCreate,
  busy = false,
  error: submitError,
}: LeadComposerProps) {
  const [draft, setDraft] = useState<LeadDraft>(emptyLeadDraft);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError("نام و نام خانوادگی را بنویس.");
      return;
    }
    if (!/^[0-9+]{8,15}$/.test(draft.phone.trim())) {
      setError("شماره تماس را درست بنویس.");
      return;
    }
    if (!draft.contactDate) {
      setError("تاریخ تماس را مشخص کن.");
      return;
    }
    if (!draft.district) {
      setError("محدوده سکونت را انتخاب کن.");
      return;
    }
    onCreate(draft, note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-[2px] sm:p-6">
      <form
        onSubmit={submit}
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
              <Phone className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">ثبت تماس</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                مشخصات را بگیر، بگو کی زنگ بزنی، و نوت بگذار.
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="بستن">
            <X className="size-4" />
          </Button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-5">
          <LeadFields
            value={draft}
            extras={more}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />

          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            {more ? "بستن جزئیات اضافه" : "ولی، روز کلاس و جزئیات بیشتر"}
          </button>

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {toFa(more ? 5 : 4)}
              </span>
              <Label className="text-sm font-bold text-slate-900">چی گفت؟</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TEMPLATES.slice(0, 4).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setNote(item)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
                >
                  {item}
                </button>
              ))}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="مثلاً: صحبت کردم، گفت فردا عصر باهام تماس بگیرم."
            />
          </section>

          {error || submitError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error || submitError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "در حال ذخیره…" : "ذخیره تماس"}
          </Button>
        </div>
      </form>
    </div>
  );
}
