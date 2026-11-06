export const REGISTRATION_STATUSES = [
  "consulting",
  "deciding",
  "enrolled",
  "lost",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const REFERRAL_SOURCES = [
  "instagram",
  "google",
  "student_referral",
  "friend_family",
  "ads",
  "website",
  "inbound_call",
  "walk_in",
  "other",
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export const COURSE_INTERESTS = [
  "piano",
  "theory",
  "both",
  "undecided",
] as const;

export type CourseInterest = (typeof COURSE_INTERESTS)[number];

export const TIME_PREFERENCES = ["morning", "evening", "flexible"] as const;
export type TimePreference = (typeof TIME_PREFERENCES)[number];

export type LeadNote = {
  id: string;
  at: string;
  text: string;
};

export type RegistrationLead = {
  id: string;
  createdAt: string;
  updatedAt: string;
  contactDate: string;
  firstName: string;
  lastName: string;
  phone: string;
  secondaryPhone: string;
  parentName: string;
  age: string;
  district: string;
  referralSource: ReferralSource;
  status: RegistrationStatus;
  interest: CourseInterest;
  preferredDays: string[];
  timePreference: TimePreference;
  followUpDate: string;
  notes: LeadNote[];
};

export type LeadDraft = Omit<
  RegistrationLead,
  "id" | "createdAt" | "updatedAt" | "notes"
>;

export const STATUS_META: Record<
  RegistrationStatus,
  {
    label: string;
    short: string;
    hint: string;
    tone: string;
    bar: string;
    chip: string;
  }
> = {
  consulting: {
    label: "مشاوره با مدیریت",
    short: "مشاوره",
    hint: "اطلاعات گرفته شده؛ باید با مدیریت هماهنگ شود.",
    tone: "border-amber-200 bg-amber-50",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800",
  },
  deciding: {
    label: "در حال تصمیم‌گیری",
    short: "تصمیم",
    hint: "هنرجو برنامه، روز کلاس یا شهریه را سبک‌سنگین می‌کند.",
    tone: "border-sky-200 bg-sky-50",
    bar: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800",
  },
  enrolled: {
    label: "ثبت‌نام شد",
    short: "ثبت‌نام",
    hint: "کلاس قطعی شده و باید به دوره اضافه شود.",
    tone: "border-emerald-200 bg-emerald-50",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800",
  },
  lost: {
    label: "ثبت‌نام نشد",
    short: "منصرف",
    hint: "این دوره نیامد؛ دلیل در نوت‌ها بماند.",
    tone: "border-slate-200 bg-slate-50",
    bar: "bg-slate-400",
    chip: "bg-slate-200 text-slate-700",
  },
};

export const REFERRAL_LABELS: Record<ReferralSource, string> = {
  instagram: "اینستاگرام",
  google: "گوگل و جستجو",
  student_referral: "معرفی هنرجو",
  friend_family: "دوست و خانواده",
  ads: "تبلیغات محیطی",
  website: "وب‌سایت آکادمی",
  inbound_call: "تماس ورودی",
  walk_in: "مراجعه حضوری",
  other: "سایر",
};

export const INTEREST_LABELS: Record<CourseInterest, string> = {
  piano: "پیانو",
  theory: "سلفژ و تئوری",
  both: "پیانو و تئوری",
  undecided: "هنوز مشخص نیست",
};

export const TIME_LABELS: Record<TimePreference, string> = {
  morning: "صبح",
  evening: "عصر",
  flexible: "منعطف",
};

export const TEHRAN_DISTRICTS: { id: string; label: string; hint: string }[] = [
  { id: "1", label: "منطقه ۱", hint: "تجریش، نیاوران، زعفرانیه" },
  { id: "2", label: "منطقه ۲", hint: "سعادت‌آباد، شهرک غرب" },
  { id: "3", label: "منطقه ۳", hint: "پاسداران، دروس، جردن" },
  { id: "4", label: "منطقه ۴", hint: "تهرانپارس شرق، حکیمیه" },
  { id: "5", label: "منطقه ۵", hint: "پونک، جنت‌آباد" },
  { id: "6", label: "منطقه ۶", hint: "ولیعصر، امیرآباد" },
  { id: "7", label: "منطقه ۷", hint: "بهارستان، سهروردی" },
  { id: "8", label: "منطقه ۸", hint: "تهرانپارس، نارمک" },
  { id: "9", label: "منطقه ۹", hint: "مهرآباد، استاد معین" },
  { id: "10", label: "منطقه ۱۰", hint: "بریانک، جیحون" },
  { id: "11", label: "منطقه ۱۱", hint: "انقلاب، حسن‌آباد" },
  { id: "12", label: "منطقه ۱۲", hint: "بازار، ۱۲ بهمن" },
  { id: "13", label: "منطقه ۱۳", hint: "پیروزی، نیروی هوایی" },
  { id: "14", label: "منطقه ۱۴", hint: "نبرد، شهید محلاتی" },
  { id: "15", label: "منطقه ۱۵", hint: "خاوران، مشیریه" },
  { id: "16", label: "منطقه ۱۶", hint: "نازی‌آباد، خزانه" },
  { id: "17", label: "منطقه ۱۷", hint: "آذری، امامزاده حسن" },
  { id: "18", label: "منطقه ۱۸", hint: "یافت‌آباد، شهرک ولیعصر" },
  { id: "19", label: "منطقه ۱۹", hint: "نعمت‌آباد، خانی‌آباد" },
  { id: "20", label: "منطقه ۲۰", hint: "شهرری" },
  { id: "21", label: "منطقه ۲۱", hint: "تهرانسر، چیتگر" },
  { id: "22", label: "منطقه ۲۲", hint: "وردآورد، پیکان‌شهر" },
  { id: "other", label: "خارج از تهران", hint: "کرج، شهرستان و سایر" },
];

export const NOTE_TEMPLATES = [
  "گفت بعداً تماس بگیرید.",
  "با مدیریت هماهنگ شد.",
  "داره درباره شهریه فکر می‌کند.",
  "باید با خانواده مشورت کند.",
  "وقت حضوری گذاشتیم.",
  "ثبت‌نام قطعی شد.",
  "این ترم منصرف شد.",
];

export function todayISO(offset = 0): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function emptyLeadDraft(): LeadDraft {
  return {
    contactDate: todayISO(),
    firstName: "",
    lastName: "",
    phone: "",
    secondaryPhone: "",
    parentName: "",
    age: "",
    district: "",
    referralSource: "inbound_call",
    status: "consulting",
    interest: "piano",
    preferredDays: [],
    timePreference: "flexible",
    followUpDate: todayISO(1),
  };
}

export function leadFullName(lead: Pick<RegistrationLead, "firstName" | "lastName">) {
  return `${lead.firstName} ${lead.lastName}`.trim() || "بدون نام";
}

export function districtLabel(id: string) {
  const found = TEHRAN_DISTRICTS.find((item) => item.id === id);
  return found ? found.label : "منطقه نامشخص";
}

export function districtHint(id: string) {
  return TEHRAN_DISTRICTS.find((item) => item.id === id)?.hint ?? "";
}

export function ageGroupLabel(age: string) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 12) return "کودک";
  if (n < 18) return "نوجوان";
  return "بزرگسال";
}

export { formatJalali as formatLeadDate } from "@/lib/jalali";

export function followUpState(date: string): "none" | "overdue" | "today" | "upcoming" {
  if (!date) return "none";
  const today = todayISO();
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "upcoming";
}

export function lastNote(lead: RegistrationLead) {
  return lead.notes.at(-1) ?? null;
}

export function toLeadDraft(lead: RegistrationLead): LeadDraft {
  return {
    contactDate: lead.contactDate,
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone,
    secondaryPhone: lead.secondaryPhone,
    parentName: lead.parentName,
    age: lead.age,
    district: lead.district,
    referralSource: lead.referralSource,
    status: lead.status,
    interest: lead.interest,
    preferredDays: lead.preferredDays,
    timePreference: lead.timePreference,
    followUpDate: lead.followUpDate,
  };
}

export function clearLocalRegistrationMocks() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("etude.registration-leads.v1");
  window.localStorage.removeItem("etude.admin-tasks.v1");
}
