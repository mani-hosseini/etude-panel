"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpLeft, Phone } from "lucide-react";

import { AdminConfirmDelete } from "@/components/admin/AdminConfirmDelete";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadFields } from "@/components/admin/registration/LeadFields";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api/admin-client";
import { adminQueryKeys, useAdminLeadQuery } from "@/lib/api/admin-queries";
import { audienceError } from "@/lib/api/errors";
import { formatDateTimeFa } from "@/lib/format";
import { adminRoutes } from "@/lib/routes";
import { announceSaved } from "@/lib/save-feedback";
import {
  NOTE_TEMPLATES,
  leadFullName,
  toLeadDraft,
  type LeadDraft,
} from "@/lib/registration-pipeline";

type LeadDetailPageProps = {
  leadId: string;
};

const PHONE_OK = /^[0-9+]{8,15}$/;

function sanitizePatch(patch: Partial<LeadDraft>): Partial<LeadDraft> {
  const next = { ...patch };
  if (next.phone != null && !PHONE_OK.test(next.phone.trim())) {
    delete next.phone;
  }
  if (next.firstName != null && !next.firstName.trim()) delete next.firstName;
  if (next.lastName != null && !next.lastName.trim()) delete next.lastName;
  if (next.followUpDate === "") next.followUpDate = "";
  return next;
}

export function LeadDetailPage({ leadId }: LeadDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const leadQuery = useAdminLeadQuery(leadId);
  const lead = leadQuery.data;
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [note, setNote] = useState("");
  const pendingRef = useRef<Partial<LeadDraft>>({});
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const enrolledRef = useRef(false);

  useEffect(() => {
    enrolledRef.current = lead?.status === "enrolled";
    if (!lead || dirtyRef.current) return;
    setDraft(toLeadDraft(lead));
  }, [lead]);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.lead(leadId) }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.leads }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.tasks }),
    ]);

  const flush = async () => {
    const patch = sanitizePatch(pendingRef.current);
    pendingRef.current = {};
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (Object.keys(patch).length === 0) {
      dirtyRef.current = false;
      return;
    }
    const becameEnrolled = patch.status === "enrolled" && !enrolledRef.current;
    const updated = await adminApi.updateLead(leadId, patch);
    dirtyRef.current = false;
    queryClient.setQueryData(adminQueryKeys.lead(leadId), updated);
    setDraft(toLeadDraft(updated));
    enrolledRef.current = updated.status === "enrolled";
    await invalidate();
    if (becameEnrolled) {
      announceSaved("تسک ثبت در سایت برای CRM ساخته شد.", { scroll: false });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onChange = (patch: Partial<LeadDraft>) => {
    dirtyRef.current = true;
    setDraft((current) => (current ? { ...current, ...patch } : current));
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flush();
    }, 450);
  };

  const addNote = useMutation({
    mutationFn: (text: string) => adminApi.addLeadNote(leadId, text),
    onSuccess: async (updated) => {
      setNote("");
      queryClient.setQueryData(adminQueryKeys.lead(leadId), updated);
      await invalidate();
      announceSaved("نوت ثبت شد.", { scroll: false });
    },
  });

  const removeLead = useMutation({
    mutationFn: () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      pendingRef.current = {};
      dirtyRef.current = false;
      return adminApi.deleteLead(leadId);
    },
    onSuccess: async () => {
      await invalidate();
      announceSaved("پرونده حذف شد.", { scroll: false });
      router.push(adminRoutes.registrations);
    },
  });

  if (leadQuery.isPending || (lead && !draft)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-[70vh] rounded-3xl" />
      </div>
    );
  }

  if (leadQuery.isError || !lead || !draft) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="پرونده پیدا نشد"
          backHref={adminRoutes.registrations}
          backLabel="بازگشت به بورد"
        />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
          {audienceError(leadQuery.error, "این پرونده پیدا نشد.")}
        </div>
      </div>
    );
  }

  const submitNote = () => {
    const text = note.trim();
    if (!text || addNote.isPending) return;
    addNote.mutate(text);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="پرونده CRM"
        title={leadFullName(lead)}
        backHref={adminRoutes.registrations}
        backLabel="بازگشت به بورد"
        actions={
          <AdminConfirmDelete
            title="حذف این پرونده؟"
            description="این تماس و نوت‌هایش از بورد ثبت‌نام برداشته می‌شود."
            onConfirm={() => removeLead.mutate()}
            disabled={removeLead.isPending}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <a
          href={`tel:${lead.phone}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand"
        >
          <Phone className="size-3.5" />
          <span dir="ltr">{lead.phone}</span>
        </a>
        {lead.status === "enrolled" ? (
          <Link
            href={adminRoutes.taskForLead(lead.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            تسک CRM
            <ArrowUpLeft className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <LeadFields value={draft} extras onChange={onChange} />
        </section>

        <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h4 className="text-sm font-bold text-slate-900">دفترچه نوت CRM</h4>
            <p className="text-xs text-slate-500">
              هر تماس یا قول بعدی را همین‌جا بنویس تا گم نشود.
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {lead.notes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                هنوز نوتی ثبت نشده.
              </p>
            ) : (
              lead.notes
                .slice()
                .reverse()
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-[11px] text-slate-400">
                      {formatDateTimeFa(item.at)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">
                      {item.text}
                    </p>
                  </div>
                ))
            )}
          </div>

          <footer className="border-t border-slate-100 bg-white px-5 py-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {NOTE_TEMPLATES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setNote(item)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-brand/30 hover:bg-brand/5"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="نوت جدید… مثلاً بعداً تماس بگیرم"
                className="min-h-16"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submitNote();
                  }
                }}
              />
              <Button
                type="button"
                onClick={submitNote}
                disabled={!note.trim() || addNote.isPending}
              >
                ثبت نوت
              </Button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
