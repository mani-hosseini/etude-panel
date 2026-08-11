import { TOTAL_SLIDES } from "@/lib/session-1-slides";

export type CourseStatus = "active" | "upcoming" | "completed";
export type SessionStatus = "available" | "upcoming" | "locked";

export type Course = {
  id: string;
  title: string;
  instrument: string;
  teacher: string;
  level: string;
  progress: number;
  nextLesson: string;
  status: CourseStatus;
  sessionsDone: number;
  sessionsTotal: number;
  focus: string;
  weeklyHours: number;
};

export type Lesson = {
  id: string;
  title: string;
  course: string;
  teacher: string;
  day: string;
  dateLabel: string;
  time: string;
  room: string;
  type: "private" | "group" | "theory";
  duration: string;
  note?: string;
  status?: "done" | "next" | "planned";
};

export type Stat = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type CourseSession = {
  id: string;
  number: number;
  title: string;
  summary: string;
  topics: string[];
  status: SessionStatus;
  slideCount: number;
  durationLabel: string;
  dateLabel: string;
};

/** پنل اختصاصی مسترکلاس تئوری موسیقی — استاد بهرام دهقانیار */
export const masterclass = {
  id: "mc-theory-01",
  title: "مسترکلاس تئوری موسیقی",
  subtitle: "سطح پایه · مخصوص هنرجویان این دوره",
  teacher: "استاد بهرام دهقانیار",
  teacherShort: "بهرام دهقانیار",
  day: "پنجشنبه",
  time: "۱۱ تا ۱۳",
  timeShort: "۱۱ تا ۱۳",
  duration: "۱۲۰ دقیقه",
  room: "سالن مسترکلاس اتود",
  level: "پایه",
  focus: "حامل، کلید سل، ارزش زمانی و میزان‌های ساده",
  sessionsTotal: 10,
  sessionsDone: 1,
  progress: 10,
  accessNote: "دسترسی فقط برای هنرجویان ثبت‌نام‌شده در این مسترکلاس",
  certificateReady: false,
} as const;

export const studentProfile = {
  fullName: "آوا محمدی",
  firstName: "آوا",
  studentCode: "ET-MC-1405-01",
  instrument: "پیانو",
  level: "پایه",
  joinedAt: "مرداد ۱۴۰۵",
  phone: "۰۹۱۲ *** **۴۵",
  email: "ava@etude.academy",
  branch: "آکادمی تخصصی پیانو اتود",
  mentor: "استاد بهرام دهقانیار",
  birthDate: "۱۳۸۵/۰۴/۱۲",
  nationalId: "۰۰۱******۴۲",
  address: "تهران، خیابان ولیعصر",
  practiceGoal: "مرور اسلایدهای جلسهٔ جاری",
  attendanceRate: "۱۰۰٪",
  totalHours: "۲",
  activeCourses: "۱",
  program: masterclass.title,
};

export const profileAchievements = [
  {
    id: "a1",
    title: "ورود به مسترکلاس",
    desc: "ثبت‌نام در دورهٔ اختصاصی تئوری موسیقی",
  },
  {
    id: "a2",
    title: "جلسهٔ اول برگزار شد",
    desc: "تاریخ برگزاری: ۱۴۰۵/۰۵/۱۵",
  },
  {
    id: "a3",
    title: "هنرجوی اختصاصی",
    desc: "دسترسی پنل فقط برای شرکت‌کنندگان این دوره",
  },
];

export const dashboardStats: Stat[] = [
  {
    id: "course",
    label: "دورهٔ فعال",
    value: "۱",
    hint: masterclass.title,
  },
  {
    id: "schedule",
    label: "زمان کلاس",
    value: "پنجشنبه",
    hint: `${masterclass.timeShort} · استاد دهقانیار`,
  },
  {
    id: "session",
    label: "جلسات برگزارشده",
    value: String(masterclass.sessionsDone),
    hint: `از ${masterclass.sessionsTotal} جلسه`,
  },
  {
    id: "progress",
    label: "پیشرفت دوره",
    value: `${masterclass.progress}٪`,
    hint: `${masterclass.sessionsDone} از ${masterclass.sessionsTotal} جلسه`,
  },
];

export const courses: Course[] = [
  {
    id: masterclass.id,
    title: masterclass.title,
    instrument: "تئوری",
    teacher: masterclass.teacher,
    level: masterclass.level,
    progress: masterclass.progress,
    nextLesson: `پنجشنبه ${masterclass.timeShort}`,
    status: "active",
    sessionsDone: masterclass.sessionsDone,
    sessionsTotal: masterclass.sessionsTotal,
    focus: masterclass.focus,
    weeklyHours: 2,
  },
];

function lockedSession(number: number): CourseSession {
  return {
    id: String(number),
    number,
    title: "",
    summary: "محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.",
    topics: [],
    status: "locked",
    slideCount: 0,
    durationLabel: "۱۲۰ دقیقه",
    dateLabel: "قفل",
  };
}

export const courseSessions: CourseSession[] = [
  {
    id: "1",
    number: 1,
    title: "پایه‌های نت‌خوانی و ریتم",
    summary:
      "آشنایی با ارتعاش و صدا، حامل، کلید سل، نت‌خوانی، علائم تغییردهنده، ارزش زمانی و میزان‌نما.",
    topics: [
      "صدا و ارتعاش",
      "حامل و کلید سل",
      "نت‌خوانی روی خط و بین خط",
      "ریتم و میزان‌نما",
    ],
    status: "available",
    slideCount: TOTAL_SLIDES,
    durationLabel: "۱۲۰ دقیقه",
    dateLabel: "۱۴۰۵/۰۵/۱۵",
  },
  {
    id: "2",
    number: 2,
    title: "",
    summary: "محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.",
    topics: [],
    status: "upcoming",
    slideCount: 0,
    durationLabel: "۱۲۰ دقیقه",
    dateLabel: "پنجشنبهٔ بعد",
  },
  ...Array.from({ length: 8 }, (_, i) => lockedSession(i + 3)),
];

export const schedule: Lesson[] = [
  {
    id: "l1",
    title: "جلسهٔ اول — پایه‌های نت‌خوانی و ریتم",
    course: masterclass.title,
    teacher: masterclass.teacher,
    day: "پنجشنبه",
    dateLabel: "۱۴۰۵/۰۵/۱۵",
    time: masterclass.time,
    room: masterclass.room,
    type: "theory",
    duration: masterclass.duration,
    note: "برگزار شده · اسلایدها در بخش جلسات آماده است",
    status: "done",
  },
  {
    id: "l2",
    title: "جلسهٔ دوم",
    course: masterclass.title,
    teacher: masterclass.teacher,
    day: "پنجشنبه",
    dateLabel: "جلسهٔ بعدی",
    time: masterclass.time,
    room: masterclass.room,
    type: "theory",
    duration: masterclass.duration,
    note: "محتوا پس از برگزاری جلسه فعال می‌شود",
    status: "next",
  },
];

export const weekDays = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export const practiceTips = [
  "اسلایدهای جلسهٔ اول را یک‌بار مرور کنید.",
  "نام نت‌های روی خط و بین خط را بلند تکرار کنید.",
  "با مترونوم، الگوی قوی/ضعیف ۲، ۳ و ۴ ضربی را دست بزنید.",
];
