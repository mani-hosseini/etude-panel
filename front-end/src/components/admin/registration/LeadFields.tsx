"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { JalaliDateField } from "@/components/ui/jalali-date-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeekdayPicker } from "@/components/ui/weekday-picker";
import { toFa } from "@/lib/format";
import {
  COURSE_INTERESTS,
  INTEREST_LABELS,
  REFERRAL_LABELS,
  REFERRAL_SOURCES,
  STATUS_META,
  TEHRAN_DISTRICTS,
  TIME_LABELS,
  TIME_PREFERENCES,
  ageGroupLabel,
  type LeadDraft,
  type RegistrationStatus,
} from "@/lib/registration-pipeline";
import { cn } from "@/lib/utils";

type LeadFieldsProps = {
  value: LeadDraft;
  onChange: (patch: Partial<LeadDraft>) => void;
  extras?: boolean;
};

export function LeadFields({ value, onChange, extras = false }: LeadFieldsProps) {
  const group = ageGroupLabel(value.age);

  return (
    <div className="space-y-6">
      <Section n={1} title="مشخصات هنرجو">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام">
            <Input
              value={value.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              placeholder="مثلاً آوا"
            />
          </Field>
          <Field label="نام خانوادگی">
            <Input
              value={value.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              placeholder="مثلاً محمدی"
            />
          </Field>
          <Field label="شماره تماس">
            <Input
              dir="ltr"
              inputMode="tel"
              value={value.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="0912…"
              className="text-left"
            />
          </Field>
          <Field label={group ? `سن · ${group}` : "سن"}>
            <Input
              inputMode="numeric"
              value={value.age}
              onChange={(e) => onChange({ age: e.target.value.replace(/\D/g, "") })}
              placeholder="مثلاً ۹"
            />
          </Field>
          <Field label="محدوده سکونت">
            <Select
              value={value.district || undefined}
              onValueChange={(district) => onChange({ district })}
            >
              <SelectTrigger>
                <SelectValue placeholder="منطقه تهران" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TEHRAN_DISTRICTS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label} — {item.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="نحوه آشنایی">
            <Select
              value={value.referralSource}
              onValueChange={(referralSource) =>
                onChange({ referralSource: referralSource as LeadDraft["referralSource"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {REFERRAL_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section n={2} title="تاریخ تماس و پیگیری">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تاریخ همین تماس">
            <JalaliDateField
              value={value.contactDate}
              onChange={(contactDate) => onChange({ contactDate })}
            />
          </Field>
          <Field label="کی دوباره زنگ بزنم؟">
            <JalaliDateField
              value={value.followUpDate}
              onChange={(followUpDate) => onChange({ followUpDate })}
              placeholder="اگر لازم است"
              allowEmpty
            />
          </Field>
        </div>
      </Section>

      <Section n={3} title="الان کجای کار است؟">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(STATUS_META) as RegistrationStatus[]).map((status) => {
            const meta = STATUS_META[status];
            const active = value.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onChange({ status })}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-right text-sm font-semibold transition",
                  active
                    ? `${meta.tone} ring-2 ring-brand/15`
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </Section>

      {extras ? (
        <Section n={4} title="جزئیات کلاس و خانواده">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام ولی / همراه">
              <Input
                value={value.parentName}
                onChange={(e) => onChange({ parentName: e.target.value })}
                placeholder="اگر کودک یا نوجوان است"
              />
            </Field>
            <Field label="تلفن دوم">
              <Input
                dir="ltr"
                inputMode="tel"
                value={value.secondaryPhone}
                onChange={(e) => onChange({ secondaryPhone: e.target.value })}
                placeholder="اختیاری"
                className="text-left"
              />
            </Field>
            <Field label="علاقه‌مندی">
              <Select
                value={value.interest}
                onValueChange={(interest) =>
                  onChange({ interest: interest as LeadDraft["interest"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_INTERESTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {INTEREST_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="ساعت ترجیحی">
              <Select
                value={value.timePreference}
                onValueChange={(timePreference) =>
                  onChange({
                    timePreference: timePreference as LeadDraft["timePreference"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PREFERENCES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {TIME_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-3">
            <Label className="mb-2 block">روزهای پیشنهادی</Label>
            <WeekdayPicker
              value={value.preferredDays}
              onChange={(preferredDays) => onChange({ preferredDays })}
              min={0}
              size="sm"
            />
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
          {toFa(n)}
        </span>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      {children}
    </label>
  );
}
