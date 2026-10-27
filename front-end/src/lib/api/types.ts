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
  days?: string[];
  classDays?: string[];
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
  homeworkTitle?: string;
  homeworkSource?: string;
  homeworkNote?: string;
  homework?: SessionHomeworkItem[];
  attendanceStatus?: string | null;
  current?: boolean;
};

export type SessionHomeworkItem = {
  id: string;
  category: string;
  title: string;
  source: string;
  note: string;
  score: number;
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
  attendanceStatus?: string | null;
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
    stars?: number;
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
  currentSessionNumber?: number;
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
    attendanceStatus?: string | null;
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
    stars?: number;
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

export type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export type ExamSubmissionSummary = {
  id: string;
  submittedAt: string;
  originalName: string;
  size: number;
};

export type StudentAssignment = {
  id: string;
  assignmentId: string;
  category: string;
  title: string;
  source: string;
  note: string;
  dueLabel: string;
  progress: number;
  score?: number;
  short: string;
  teacher: string;
  courseTitle: string | null;
  sessionId?: string | null;
  sessionNumber?: number | null;
};

export type PracticeSeries = {
  range: "7d" | "30d" | "90d";
  points: Array<{ label: string; planned: number; done: number }>;
  todayMinutes: number;
};

export type PathLevelProgress = {
  level: number;
  progress: number;
  state: "done" | "current" | "locked";
  tracks: {
    technique: number;
    theory: number;
    solfege: number;
    piece: number;
  };
};

export type PathTrackStat = {
  key: "technique" | "theory" | "solfege" | "piece";
  label: string;
  average: number;
  count: number;
  sessions: Array<{ sessionNumber: number | null; score: number }>;
};

export type PathProgress = {
  currentLevel: number;
  tracks: {
    technique: number;
    theory: number;
    solfege: number;
    piece: number;
  };
  overallPercent: number;
  stars?: number;
  todayMinutes?: number;
  week?: Array<{ label: string; planned: number; done: number }>;
  streak?: number;
  assignments?: StudentAssignment[];
  focus?: StudentAssignment | null;
  levels?: PathLevelProgress[];
  trackStats?: PathTrackStat[];
};

export type StudentExam = {
  id: string;
  title: string;
  description: string;
  status: Exclude<ExamStatus, "DRAFT">;
  canSubmit: boolean;
  submitted: boolean;
  answersVisible: boolean;
  createdAt: string;
  updatedAt: string;
  hasExamFile: boolean;
  examFileName: string | null;
  examFileSize: number | null;
  hasAnswerFile: boolean;
  answerFileName: string | null;
  answerFileSize: number | null;
  submission: ExamSubmissionSummary | null;
};
