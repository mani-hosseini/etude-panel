"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { UNIT_TONE, UnitIcon } from "@/components/panel/support/support-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { audienceError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/queries";
import { routes } from "@/lib/routes";
import { announceSaved } from "@/lib/save-feedback";
import {
  SUPPORT_UNITS,
  isSupportUnitId,
  type SupportUnitId,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

export function NewTicketPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preset = searchParams.get("unit");
  const [unitId, setUnitId] = useState<SupportUnitId | null>(
    isSupportUnitId(preset) ? preset : null,
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => SUPPORT_UNITS.find((unit) => unit.id === unitId) ?? null,
    [unitId],
  );

  const createTicket = useMutation({
    mutationFn: () =>
      api.createSupportTicket({
        unitId: unitId!,
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: async (ticket) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets });
      announceSaved(`برای ${selected?.label} ثبت شد.`, { scroll: false });
      router.push(routes.supportTicket(ticket.id));
    },
    onError: (err) => setError(audienceError(err)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!unitId) {
      setError("اول واحد را انتخاب کنید.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      setError("عنوان و متن را بنویسید.");
      return;
    }
    setError(null);
    createTicket.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={routes.support}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"
      >
        <ChevronRight className="size-4" />
        پشتیبانی
      </Link>

      <div>
        <h2 className="text-xl font-bold text-navy">تیکت جدید</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          واحد را انتخاب کنید تا پیام به همان تیم برسد.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SUPPORT_UNITS.map((unit) => {
          const tone = UNIT_TONE[unit.id];
          const active = unitId === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                setUnitId(unit.id);
                setError(null);
              }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-white p-3 text-right transition",
                active
                  ? `border-transparent ring-2 ${tone.ring}`
                  : "border-border hover:border-brand/25",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  tone.icon,
                )}
              >
                <UnitIcon unitId={unit.id} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-navy">{unit.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {unit.short}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-border bg-white p-5"
      >
        <div className="space-y-2">
          <Label htmlFor="ticket-title">عنوان</Label>
          <Input
            id="ticket-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              selected ? `موضوع ${selected.label}` : "موضوع را کوتاه بنویسید"
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ticket-body">پیام</Label>
          <Textarea
            id="ticket-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-32"
            placeholder="جزئیات را برای همان واحد بنویسید."
          />
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!unitId || createTicket.isPending}>
            {createTicket.isPending ? "در حال ارسال…" : "ارسال"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={routes.support}>انصراف</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
