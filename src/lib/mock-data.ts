export type CourseStatus = "active" | "upcoming" | "completed";

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
};

export type Lesson = {
  id: string;
  title: string;
  course: string;
  teacher: string;
  day: string;
  time: string;
  room: string;
  type: "private" | "group" | "theory";
};

export type Stat = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export const studentProfile = {
  fullName: "آوا محمدی",
  studentCode: "ET-1404-0821",
  instrument: "پیانو",
  level: "متوسط",
  joinedAt: "مهر ۱۴۰۳",
  phone: "۰۹۱۲ *** **۴۵",
  email: "ava@etude.academy",
};

export const dashboardStats: Stat[] = [
  {
    id: "courses",
    label: "دوره‌های فعال",
    value: "۳",
    hint: "پیانو، سلفژ، تئوری",
  },
  {
    id: "hours",
    label: "ساعت تمرین این ماه",
    value: "۱۸",
    hint: "۴ ساعت بیشتر از ماه قبل",
  },
  {
    id: "attendance",
    label: "حضور در کلاس",
    value: "۹۶٪",
    hint: "۱۲ از ۱۳ جلسه",
  },
  {
    id: "next",
    label: "جلسه بعدی",
    value: "فردا",
    hint: "۱۷:۳۰ — کلاس پیانو",
  },
];

export const courses: Course[] = [
  {
    id: "1",
    title: "پیانو کلاسیک",
    instrument: "پیانو",
    teacher: "استاد رضایی",
    level: "متوسط",
    progress: 68,
    nextLesson: "فردا ۱۷:۳۰",
    status: "active",
    sessionsDone: 14,
    sessionsTotal: 20,
  },
  {
    id: "2",
    title: "سلفژ و گوش‌ورزی",
    instrument: "صدا",
    teacher: "استاد کریمی",
    level: "مقدماتی",
    progress: 42,
    nextLesson: "چهارشنبه ۱۶:۰۰",
    status: "active",
    sessionsDone: 8,
    sessionsTotal: 16,
  },
  {
    id: "3",
    title: "تئوری موسیقی",
    instrument: "تئوری",
    teacher: "استاد نوری",
    level: "پایه",
    progress: 55,
    nextLesson: "پنجشنبه ۱۸:۱۵",
    status: "active",
    sessionsDone: 10,
    sessionsTotal: 18,
  },
  {
    id: "4",
    title: "کارگاه آنسامبل",
    instrument: "گروهی",
    teacher: "استاد احمدی",
    level: "متوسط",
    progress: 0,
    nextLesson: "شروع از مهر",
    status: "upcoming",
    sessionsDone: 0,
    sessionsTotal: 12,
  },
];

export const schedule: Lesson[] = [
  {
    id: "l1",
    title: "تمرین سونات پاتهتیک",
    course: "پیانو کلاسیک",
    teacher: "استاد رضایی",
    day: "سه‌شنبه",
    time: "۱۷:۳۰ — ۱۸:۳۰",
    room: "استودیو ۱",
    type: "private",
  },
  {
    id: "l2",
    title: "فاصله‌ها و آکوردها",
    course: "سلفژ و گوش‌ورزی",
    teacher: "استاد کریمی",
    day: "چهارشنبه",
    time: "۱۶:۰۰ — ۱۷:۰۰",
    room: "کلاس B",
    type: "group",
  },
  {
    id: "l3",
    title: "هارمونی پایه",
    course: "تئوری موسیقی",
    teacher: "استاد نوری",
    day: "پنجشنبه",
    time: "۱۸:۱۵ — ۱۹:۱۵",
    room: "کلاس A",
    type: "theory",
  },
  {
    id: "l4",
    title: "مرور اتود شوپن",
    course: "پیانو کلاسیک",
    teacher: "استاد رضایی",
    day: "شنبه",
    time: "۱۰:۰۰ — ۱۱:۰۰",
    room: "استودیو ۱",
    type: "private",
  },
];

export const practiceTips = [
  "هر روز ۲۰ دقیقه با مترونوم تمرین کنید.",
  "قبل از جلسه بعدی، میزان‌های ۱۲ تا ۲۴ را مرور کنید.",
  "ضبط کوتاه از تمرین‌تان بفرستید تا بازخورد بگیرید.",
];
