import { studentHttp } from "@/lib/api/student-tokens";

export type StudioClass = {
  id: string;
  uuid: string;
  title: string;
  day: string;
  days?: string[];
  start: string;
  end: string;
  room: string;
  focus: string;
  studentCount: number;
};

export type StudioStudent = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  level: number;
  classId: string;
  classTitle?: string;
  classDays?: string[];
  piece: string;
  lastSeen: string;
  attendanceRate: number;
  stars: number;
  phone: string | null;
  avatarUrl?: string | null;
  assignments?: StudioAssignment[];
  sessions?: StudioStudentSession[];
};

export type StudioStudentSession = {
  id: string;
  courseId: string;
  courseTitle: string;
  number: number;
  title: string;
  status: string;
  dateLabel: string;
  homeworkTitle: string;
  homeworkSource: string;
  homeworkNote: string;
  attendance: string | null;
  current?: boolean;
  confirmed?: boolean;
};

export type StudioAssignment = {
  id: string;
  category: string;
  title: string;
  source: string;
  note: string;
  dueLabel: string;
  progress: number;
  createdAt: string;
  classId: string | null;
  classTitle: string | null;
  studentIds: string[];
  sessionId?: string | null;
  sessionNumber?: number | null;
  sessionTitle?: string | null;
  targets: Array<{
    id: string;
    studentId: string;
    displayName: string;
    progress: number;
    score?: number;
  }>;
};

export type StudioProfile = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string;
  instrument: string | null;
  room: string | null;
  bio: string | null;
  phone: string | null;
  since: string;
  studentCount: number;
};

export type StudioOverview = {
  profile: StudioProfile;
  stats: {
    students: number;
    classes: number;
    activeAssignments: number;
    avgAttendance: number;
  };
  nextClass: StudioClass | null;
  recentAssignments: StudioAssignment[];
  students: StudioStudent[];
  classes: StudioClass[];
};

export type StudioMeeting = {
  id: string;
  courseId: string;
  sessionNumber?: number;
  label: string;
  day: string;
  title: string;
  start: string;
  end: string;
  room: string;
  status?: string;
  homeworkTitle?: string;
  homeworkSource?: string;
  homeworkNote?: string;
};

export type StudioAttendanceMark = {
  courseId?: string;
  meetingKey: string;
  studentId: string;
  status: string;
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

export type PathTrackStat = {
  key: "technique" | "theory" | "solfege" | "piece";
  label: string;
  average: number;
  count: number;
  sessions: Array<{ sessionNumber: number | null; score: number }>;
};

export type StudioTodayStudent = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  level: number;
  piece: string;
  stars: number;
  avatarUrl?: string | null;
  sessionId: string | null;
  sessionNumber: number | null;
  sessionTitle: string;
  attendance: string | null;
  nextSessionNumber: number | null;
  nextHomework: Array<{ category: string; title: string }>;
};

export type StudioTodayClass = {
  id: string;
  courseId: string;
  title: string;
  start: string;
  end: string;
  room: string;
  focus: string;
  held: number;
  marked: number;
  students: StudioTodayStudent[];
};

export type StudioTodayRoster = {
  today: string;
  classes: StudioTodayClass[];
  nextClass: StudioClass | null;
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
  trackStats?: PathTrackStat[];
};

export const studioApi = {
  overview: () => studentHttp.requestData<StudioOverview>("/studio"),
  profile: () => studentHttp.requestData<StudioProfile>("/studio/profile"),
  updateProfile: (body: {
    title?: string;
    instrument?: string;
    room?: string;
    bio?: string;
    phone?: string;
  }) =>
    studentHttp.requestData<StudioProfile>("/studio/profile", {
      method: "PATCH",
      body,
    }),
  classes: () => studentHttp.requestData<StudioClass[]>("/studio/classes"),
  students: () => studentHttp.requestData<StudioStudent[]>("/studio/students"),
  student: (id: string) =>
    studentHttp.requestData<StudioStudent>(`/studio/students/${id}`),
  schedule: () =>
    studentHttp.requestData<{
      today: string;
      days: Array<{
        day: string;
        slots: Array<{
          id: string;
          courseId: string;
          title: string;
          start: string;
          end: string;
          room: string;
          focus: string;
          studentIds: string[];
        }>;
      }>;
      students: StudioStudent[];
      classes: StudioClass[];
    }>("/studio/schedule"),
  assignments: () =>
    studentHttp.requestData<StudioAssignment[]>("/studio/assignments"),
  createAssignment: (body: {
    courseId?: string;
    studentIds?: string[];
    sessionId?: string;
    category: string;
    title: string;
    source?: string;
    note?: string;
    dueLabel?: string;
    score?: number;
    forNextSession?: boolean;
  }) =>
    studentHttp.requestData<StudioAssignment>("/studio/assignments", {
      method: "POST",
      body,
    }),
  deleteAssignment: (id: string) =>
    studentHttp.requestData<{ deleted: boolean }>(`/studio/assignments/${id}`, {
      method: "DELETE",
    }),
  updateTargetProgress: (
    targetId: string,
    body: { progress?: number; score?: number },
  ) =>
    studentHttp.requestData<{ id: string; progress: number; score: number }>(
      `/studio/assignments/${targetId}/progress`,
      { method: "PATCH", body },
    ),
  saveScores: (scores: Array<{ targetId: string; score: number }>) =>
    studentHttp.requestData<{
      saved: number;
      scores: Array<{ targetId: string; score: number }>;
    }>("/studio/scores", {
      method: "PATCH",
      body: { scores },
    }),
  meetings: () =>
    studentHttp.requestData<{
      meetings: StudioMeeting[];
      students: StudioStudent[];
      attendance: StudioAttendanceMark[];
    }>("/studio/meetings"),
  setStars: (studentId: string, stars: number) =>
    studentHttp.requestData<{ studentId: string; stars: number }>(
      `/studio/students/${studentId}/stars`,
      { method: "PATCH", body: { stars } },
    ),
  setLevel: (studentId: string, level: number) =>
    studentHttp.requestData<{ studentId: string; level: number }>(
      `/studio/students/${studentId}/level`,
      { method: "PATCH", body: { level } },
    ),
  today: () =>
    studentHttp.requestData<StudioTodayRoster>("/studio/today"),
  markTodayAttendance: (
    marks: Array<{ studentId: string; sessionId: string; status: string }>,
  ) =>
    studentHttp.requestData<StudioTodayRoster>("/studio/today/attendance", {
      method: "PUT",
      body: { marks },
    }),
  saveSessionWork: (sessionId: string, body: {
    studentId?: string;
    attendance?: string;
    homeworkTitle?: string;
    homeworkSource?: string;
    homeworkNote?: string;
  }) =>
    studentHttp.requestData<{
      sessionId: string;
      courseId: string;
      number: number;
      status: string;
      homeworkTitle: string;
      homeworkSource: string;
      homeworkNote: string;
      unlocked: boolean;
      attendance: string | null;
    }>(`/studio/sessions/${sessionId}/work`, { method: "PUT", body }),
  setAttendance: (body: {
    courseId: string;
    meetingKey: string;
    studentId: string;
    status: string;
  }) =>
    studentHttp.requestData<{
      courseId: string;
      meetingKey: string;
      studentId: string;
      status: string;
    }>("/studio/attendance", { method: "PUT", body }),
  confirmSession: (studentId: string, sessionId: string) =>
    studentHttp.requestData<{
      studentId: string;
      confirmedSessionId: string;
      confirmedNumber: number;
      currentSessionNumber: number;
      isLast: boolean;
      nextSession: {
        id: string;
        number: number;
        title: string;
        courseId: string;
      } | null;
    }>(`/studio/students/${studentId}/sessions/${sessionId}/confirm`, {
      method: "POST",
    }),
};
