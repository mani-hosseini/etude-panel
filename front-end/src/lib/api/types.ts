export type CourseStatus = "active" | "upcoming" | "completed";
export type SessionStatus = "available" | "upcoming" | "locked";
export type LessonStatus = "done" | "next" | "planned";

export type CourseCard = {
  id: string;
  uuid?: string;
  title: string;
  subtitle: string;
  instrument: string;
  teacher: string;
  teacherShort: string;
  day: string;
  time: string;
  timeShort: string;
  duration: string;
  room: string;
  level: string;
  focus: string;
  sessionsTotal: number;
  sessionsDone: number;
  progress: number;
  weeklyHours: number;
  status: CourseStatus;
  nextLesson: string;
  certificateReady: boolean;
  accessNote?: string;
};

export type CourseSession = {
  id: string;
  uuid?: string;
  number: number;
  title: string;
  summary: string;
  topics: string[];
  status: SessionStatus;
  slideCount: number;
  attachmentCount?: number;
  durationLabel: string;
  dateLabel: string;
  timeLabel?: string;
  courseId?: string;
  courseTitle?: string;
  progressPercent?: number;
};

export type ScheduleLesson = {
  id: string;
  title: string;
  course?: string;
  teacher: string;
  day: string;
  dateLabel: string;
  time: string;
  room: string;
  type?: string;
  duration: string;
  note?: string;
  status: LessonStatus;
  sessionId?: string;
};

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type DashboardPayload = {
  student: {
    displayName: string;
    studentCode: string | null;
    level: string | null;
    avatarUrl: string | null;
  };
  courses: CourseCard[];
  primaryCourse: CourseCard | null;
  stats: DashboardStat[];
  nextLesson: {
    id: string;
    title: string;
    day: string;
    time: string;
    dateLabel?: string;
    status: LessonStatus;
  } | null;
  lastLesson: {
    id: string;
    title: string;
    day: string;
    time: string;
    dateLabel?: string;
    status: LessonStatus;
  } | null;
  currentSession: CourseSession | null;
  schedulePreview: Array<{
    id: string;
    title: string;
    day: string;
    time: string;
    dateLabel?: string;
    status: LessonStatus;
  }>;
  practiceTips: string[];
  slideCount: number;
};

export type SessionsPayload = {
  course: CourseCard;
  sessions: CourseSession[];
};

export type SchedulePayload = {
  course: CourseCard;
  lessons: ScheduleLesson[];
  sessions: Array<{
    id: string;
    number: number;
    status: SessionStatus;
    title?: string;
    dateLabel?: string;
    timeLabel?: string;
  }>;
};

export type ProfilePayload = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    studentCode: string | null;
    level: string;
    avatarUrl: string | null;
    phone: string | null;
    nationalId: string | null;
    address: string | null;
    programTitle: string;
    attendanceRate: string;
    totalHours: string;
    activeCoursesCount: string;
  };
  courses: CourseCard[];
  primaryCourse: {
    teacher: string;
    timeShort: string;
    certificateReady: boolean;
  } | null;
  achievements: Array<{ id: string; title: string; desc: string }>;
};

export type SlideTerm = { en: string; fa: string };

export type ApiSlide = {
  id: string;
  chapter: string;
  title: string;
  goal: string;
  body: string;
  bullets: string[];
  terms: SlideTerm[];
  mistakes: string[];
  imageHint?: string;
  imageId?: string;
  funFact?: string;
  kind?: "cover" | "lesson" | "visual" | "outro";
};

export type SessionAttachment = {
  id: string;
  path: string;
  caption?: string;
  filename: string;
  mimeType: string;
  sortOrder: number;
};
