export type SupportUnitId = "education" | "finance" | "reception" | "tech";
export type TicketStatus = "pending" | "replied" | "closed";
export type MessageAuthor = "student" | "staff";

export type SupportMessage = {
  id: string;
  author: MessageAuthor;
  body: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  unitId: SupportUnitId;
  studentId?: string;
  studentName: string;
  title: string;
  status: TicketStatus;
  unreadForStudent: boolean;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export type SupportUnit = {
  id: SupportUnitId;
  label: string;
  short: string;
  description: string;
  topics: readonly string[];
  staffLabel: string;
};

export type AdminSupportStats = {
  pending: number;
  replied: number;
  closed: number;
  avgWaitMinutes: number;
  pendingByUnit: Record<SupportUnitId, number>;
};

export type AdminSupportListParams = {
  unit?: SupportUnitId;
  status?: TicketStatus;
  search?: string;
};

export const SUPPORT_UNITS: readonly SupportUnit[] = [
  {
    id: "education",
    label: "آموزش",
    short: "استاد و جلسات",
    description: "تکلیف، جلسه، سطح و نمره",
    topics: ["تکلیف", "جلسه", "سطح", "نمره"],
    staffLabel: "واحد آموزش",
  },
  {
    id: "finance",
    label: "امور مالی",
    short: "شهریه و فیش",
    description: "شهریه، فیش و اقساط",
    topics: ["شهریه", "فیش", "قسط"],
    staffLabel: "واحد مالی",
  },
  {
    id: "reception",
    label: "پذیرش",
    short: "زمان کلاس",
    description: "ساعت کلاس، غیبت و جابجایی",
    topics: ["ساعت کلاس", "غیبت", "جابجایی"],
    staffLabel: "واحد پذیرش",
  },
  {
    id: "tech",
    label: "فنی",
    short: "پنل و ورود",
    description: "ورود، ویدیو و مشکل فنی",
    topics: ["ورود", "ویدیو", "اپ"],
    staffLabel: "واحد فنی",
  },
] as const;

export const TICKET_STATUS_COPY: Record<
  TicketStatus,
  { label: string; admin: string; hint: string }
> = {
  pending: {
    label: "باز",
    admin: "نیاز به پاسخ",
    hint: "منتظر پاسخ همان واحد است",
  },
  replied: {
    label: "پاسخ واحد",
    admin: "پاسخ داده شد",
    hint: "واحد جواب داده است",
  },
  closed: {
    label: "بسته",
    admin: "بسته",
    hint: "این گفتگو تمام شده",
  },
};

export const SUPPORT_REPLY_TEMPLATES: Record<SupportUnitId, readonly string[]> = {
  education: [
    "سلام، موضوع را با استاد چک می‌کنیم و همین‌جا خبر می‌دهیم.",
    "ثبت شده است. یک‌بار صفحهٔ جلسات را تازه کنید.",
    "سطح بعدی بعد از تکمیل جلسهٔ جاری باز می‌شود.",
  ],
  finance: [
    "فیش دریافت شد و در حال بررسی است.",
    "پرداخت تأیید شد و در پرونده ثبت گردید.",
    "اگر نیاز به قسط‌بندی دارید، مبلغ و تاریخ پیشنهادی را بنویسید.",
  ],
  reception: [
    "با استاد هماهنگ می‌کنیم و ساعت جایگزین را همین‌جا می‌نویسیم.",
    "ساعت کلاس طبق برنامه است؛ اگر نمی‌رسید از همین تیکت اطلاع بدهید.",
  ],
  tech: [
    "لینک را بررسی کردیم. یک‌بار با وای‌فای باز کنید.",
    "اگر باز نشد مدل گوشی و مرورگر را بنویسید تا دقیق‌تر چک کنیم.",
  ],
};

const STORAGE_KEY = "etude-support-tickets-v3";

export function clearLocalSupportMocks() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getSupportUnit(id: string | null | undefined) {
  return SUPPORT_UNITS.find((unit) => unit.id === id) ?? null;
}

export function isSupportUnitId(
  value: string | null | undefined,
): value is SupportUnitId {
  return SUPPORT_UNITS.some((unit) => unit.id === value);
}

export function lastMessage(ticket: SupportTicket) {
  return ticket.messages[ticket.messages.length - 1];
}

export function sortTickets(
  list: SupportTicket[],
  mode: "student" | "admin" = "admin",
) {
  const rank: Record<TicketStatus, number> = {
    pending: 0,
    replied: 1,
    closed: 2,
  };
  return [...list].sort((a, b) => {
    if (mode === "student") {
      const unread = Number(b.unreadForStudent) - Number(a.unreadForStudent);
      if (unread !== 0) return unread;
    }
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function unreadStudentTickets(list: SupportTicket[] = []) {
  return list.filter((ticket) => ticket.unreadForStudent);
}

export function pendingAdminTickets(list: SupportTicket[] = []) {
  return list.filter((ticket) => ticket.status === "pending");
}

export function ticketMatchesQuery(ticket: SupportTicket, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const unit = getSupportUnit(ticket.unitId);
  const haystack = [
    ticket.title,
    ticket.studentName,
    unit?.label,
    lastMessage(ticket)?.body,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
