import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import {
  AttendanceStatus,
  CourseStatus,
  SessionStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  SESSION_STATUS_API,
  SLIDE_KIND_API,
  isUuid,
  normalizeName,
  normalizeStudentLevel,
  slideProgressPercent,
  toPersianDigits,
} from '../common/utils/mappers';
import { formatTimeRange } from '../common/utils/session-time';
import { courseIdentityWhere } from '../common/utils/slug';
import { assignedDays, joinDays, normalizeDays } from '../common/utils/weekdays';
import {
  classWasHeld,
  courseUnlocksByClassHeld,
} from '../common/utils/session-unlock';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type ScheduleWindowItem = {
  id: string;
  title: string;
  day: string;
  time: string;
  dateLabel: string;
  room: string;
  teacher: string;
  duration: string;
  note?: string;
  status: 'done' | 'next' | 'planned';
  sessionId?: string;
};

const COURSE_STATUS_API = {
  ACTIVE: 'active',
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
} as const;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(userId: string, query: PaginationQueryDto) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const enrolledIds = enrollments.map((e) => e.courseId);

    const where = {
      isActive: true,
      ...(enrolledIds.length > 0
        ? { id: { in: enrolledIds } }
        : { id: { in: [] as string[] } }),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              {
                teacher: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    const homeworkByCourse = await this.lastHomeworkByCourse(
      userId,
      rows.map((course) => course.id),
    );
    const courses = await Promise.all(
      rows.map(async (course) =>
        this.mapCourseWithProgress(
          course,
          undefined,
          homeworkByCourse.get(course.id) ?? 0,
        ),
      ),
    );

    return {
      data: { courses },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getCourse(userId: string, idOrSlug: string) {
    const course = await this.findEnrolledCourse(userId, idOrSlug);
    const classDays = await this.enrollmentClassDays(userId, course.id);
    const sessionsDone = await this.lastHomeworkNumber(userId, course.id);
    return this.mapCourseWithProgress(course, classDays, sessionsDone);
  }

  async listSessions(
    userId: string,
    query: PaginationQueryDto & { courseId?: string },
  ) {
    const course = query.courseId
      ? await this.findEnrolledCourse(userId, query.courseId)
      : await this.findPrimaryCourse(userId);

    const where = {
      courseId: course.id,
      ...(query.search
        ? {
            OR: [
              {
                title: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                summary: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.courseSession.count({ where }),
      this.prisma.courseSession.findMany({
        where,
        orderBy: { number: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: { select: { slides: true, attachments: true, exercises: true } },
        },
      }),
    ]);

    const progressRows = await this.prisma.sessionProgress.findMany({
      where: {
        userId,
        sessionId: { in: rows.map((r) => r.id) },
      },
    });
    const progressBySession = new Map(
      progressRows.map((p) => [p.sessionId, p]),
    );
    const sessionIds = rows.map((r) => r.id);
    const [homeworkBySession, attendanceBySession, enrollment, cursor] =
      await Promise.all([
        this.sessionHomeworkForStudent(userId, sessionIds),
        this.sessionAttendanceForStudent(userId, sessionIds),
        this.prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId: course.id } },
        }),
        this.lastHomeworkNumber(userId, course.id),
      ]);

    return {
      data: {
        course: await this.mapCourseWithProgress(
          course,
          enrollment?.classDays,
          cursor,
        ),
        currentSessionNumber: cursor,
        sessions: rows.map((session) => {
          const progress = progressBySession.get(session.id);
          const slideCount = session._count.slides;
          const percent = progress
            ? slideProgressPercent(
                progress.lastSlideIndex,
                slideCount,
                progress.completedAt,
              )
            : 0;
          return this.mapSession(
            session,
            slideCount,
            percent,
            session._count.attachments,
            course.timeShort,
            homeworkBySession.get(session.id),
            attendanceBySession.get(session.id),
            cursor,
            session._count.exercises,
            courseUnlocksByClassHeld(course),
          );
        }),
      },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getSession(userId: string, idOrNumber: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);
    const [slideCount, attachmentCount, exerciseCount, homeworkBySession, attendanceBySession, cursor] =
      await Promise.all([
        this.prisma.slide.count({ where: { sessionId: session.id } }),
        this.prisma.sessionAttachment.count({
          where: { sessionId: session.id },
        }),
        this.prisma.sessionExercise.count({
          where: { sessionId: session.id },
        }),
        this.sessionHomeworkForStudent(userId, [session.id]),
        this.sessionAttendanceForStudent(userId, [session.id]),
        this.lastHomeworkNumber(userId, course.id),
      ]);
    return {
      ...this.mapSession(
        session,
        slideCount,
        0,
        attachmentCount,
        course.timeShort,
        homeworkBySession.get(session.id),
        attendanceBySession.get(session.id),
        cursor,
        exerciseCount,
        courseUnlocksByClassHeld(course),
      ),
      courseId: course.slug,
      courseTitle: course.title,
    };
  }

  async getSessionSlides(
    userId: string,
    idOrNumber: string,
    courseId?: string,
  ) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);

    await this.assertSessionVisible(userId, session, course);

    const slides = await this.prisma.slide.findMany({
      where: { sessionId: session.id },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      courseId: course.slug,
      courseTitle: course.title,
      sessionId: session.id,
      sessionNumber: session.number,
      total: slides.length,
      slides: slides.map((slide) => ({
        id: slide.sourceId,
        chapter: slide.chapter,
        title: slide.title,
        goal: slide.goal,
        body: slide.body,
        bullets: slide.bullets,
        terms: slide.terms,
        mistakes: slide.mistakes,
        imageHint: slide.imageHint ?? undefined,
        imageId: slide.imageId ?? undefined,
        funFact: slide.funFact ?? undefined,
        kind: SLIDE_KIND_API[slide.kind],
      })),
    };
  }

  async getSessionAttachments(
    userId: string,
    idOrNumber: string,
    courseId?: string,
  ) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);

    await this.assertSessionVisible(userId, session, course);

    const attachments = await this.prisma.sessionAttachment.findMany({
      where: { sessionId: session.id },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      courseId: course.slug,
      courseTitle: course.title,
      sessionId: session.id,
      sessionNumber: session.number,
      total: attachments.length,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        path: attachment.path,
        caption: attachment.caption ?? undefined,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sortOrder: attachment.sortOrder,
      })),
    };
  }

  async getSessionExercises(
    userId: string,
    idOrNumber: string,
    courseId?: string,
  ) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);

    await this.assertSessionVisible(userId, session, course);

    const exercises = await this.prisma.sessionExercise.findMany({
      where: { sessionId: session.id },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      courseId: course.slug,
      courseTitle: course.title,
      sessionId: session.id,
      sessionNumber: session.number,
      total: exercises.length,
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        path: exercise.path,
        caption: exercise.caption ?? undefined,
        filename: exercise.filename,
        mimeType: exercise.mimeType,
        size: exercise.size,
        sortOrder: exercise.sortOrder,
      })),
    };
  }

  async getSchedule(userId: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findPrimaryCourse(userId);

    const classDays = await this.enrollmentClassDays(userId, course.id);
    const courseMeta = {
      teacher: course.teacher,
      day: joinDays(classDays, course.day),
      time: course.timeShort,
      room: course.room,
      duration: course.duration,
    };

    const [lessons, sessions, mapped, marks] = await Promise.all([
      this.buildFullScheduleFromSessions(course.id, courseMeta),
      this.prisma.courseSession.findMany({
        where: { courseId: course.id },
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          status: true,
          title: true,
          dateLabel: true,
          timeStart: true,
          timeEnd: true,
        },
      }),
      this.mapCourseWithProgress(
        course,
        classDays,
        await this.lastHomeworkNumber(userId, course.id),
      ),
      this.prisma.attendanceRecord.findMany({
        where: { studentId: userId, courseId: course.id },
        select: { meetingKey: true, status: true },
      }),
    ]);
    const attendanceBySession = new Map(
      marks.map((row) => [row.meetingKey, row.status.toLowerCase()]),
    );

    return {
      course: mapped,
      lessons: lessons.map((lesson) => ({
        ...lesson,
        attendanceStatus: lesson.sessionId
          ? (attendanceBySession.get(lesson.sessionId) ?? null)
          : null,
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        number: s.number,
        status: SESSION_STATUS_API[s.status],
        title: s.title,
        dateLabel: s.dateLabel,
        timeLabel: formatTimeRange(s.timeStart, s.timeEnd, course.timeShort),
        attendanceStatus: attendanceBySession.get(s.id) ?? null,
      })),
    };
  }

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: { course: true },
      orderBy: { joinedAt: 'asc' },
    });

    const homeworkByCourse = await this.lastHomeworkByCourse(
      userId,
      enrollments.map((e) => e.courseId),
    );
    const courses = await Promise.all(
      enrollments.map((e) =>
        this.mapCourseWithProgress(
          e.course,
          e.classDays,
          homeworkByCourse.get(e.courseId) ?? 0,
        ),
      ),
    );

    const activeCourses = courses.filter((c) => c.status === 'active');
    const primary = activeCourses[0] ?? courses[0];

    const primaryEnrollment = enrollments.find(
      (e) => e.course.slug === primary?.id,
    );

    const tips = primaryEnrollment
      ? await this.prisma.practiceTip.findMany({
          where: { courseId: primaryEnrollment.courseId },
          orderBy: { sortOrder: 'asc' },
        })
      : [];

    const scheduleWindow = primaryEnrollment
      ? await this.buildScheduleWindow(primaryEnrollment.courseId, {
          teacher: primaryEnrollment.course.teacher,
          day: joinDays(
            assignedDays(
              primaryEnrollment.classDays,
              primaryEnrollment.course.days,
              primaryEnrollment.course.day,
            ),
            primaryEnrollment.course.day,
          ),
          time: primaryEnrollment.course.timeShort,
          room: primaryEnrollment.course.room,
          duration: primaryEnrollment.course.duration,
        })
      : [];

    const homeworkCursor = primaryEnrollment
      ? (homeworkByCourse.get(primaryEnrollment.courseId) ?? 0)
      : 0;
    const currentSession =
      primaryEnrollment && homeworkCursor > 0
        ? await this.prisma.courseSession.findFirst({
            where: {
              courseId: primaryEnrollment.courseId,
              number: homeworkCursor,
            },
            include: {
              _count: {
                select: { slides: true, attachments: true, exercises: true },
              },
            },
          })
        : null;
    const currentAttendance =
      currentSession && primaryEnrollment
        ? (
            await this.sessionAttendanceForStudent(userId, [
              currentSession.id,
            ])
          ).get(currentSession.id)
        : undefined;

    const avgProgress =
      activeCourses.length > 0
        ? Math.round(
            activeCourses.reduce((sum, c) => sum + c.progress, 0) /
              activeCourses.length,
          )
        : 0;

    const lastHeld =
      scheduleWindow.find((l) => l.status === 'done') ?? null;
    const nextLesson =
      scheduleWindow.find((l) => l.status === 'next') ??
      scheduleWindow.find((l) => l.status === 'planned') ??
      null;

    return {
      student: {
        displayName: user.displayName,
        studentCode: user.studentCode,
        level: normalizeStudentLevel(user.level),
        avatarUrl: user.avatarUrl,
        stars: await this.studentStars(
          userId,
          primaryEnrollment?.course.teacherId,
        ),
      },
      courses,
      primaryCourse: primary ?? null,
      stats: [
        {
          id: 'courses',
          label: 'دوره‌های فعال',
          value: toPersianDigits(activeCourses.length),
          hint: `${toPersianDigits(courses.length)} دوره ثبت‌شده`,
        },
        {
          id: 'schedule',
          label: 'زمان کلاس',
          value: primary?.day ?? '—',
          hint: primary
            ? `${primary.timeShort} · ${primary.teacherShort}`
            : 'دوره‌ای انتخاب نشده',
        },
        {
          id: 'session',
          label: 'جلسات برگزارشده',
          value: toPersianDigits(primary?.sessionsDone ?? 0),
          hint: primary
            ? `از ${toPersianDigits(primary.sessionsTotal)} جلسه`
            : '—',
        },
        {
          id: 'progress',
          label: 'میانگین پیشرفت',
          value: `${toPersianDigits(avgProgress)}٪`,
          hint: `${toPersianDigits(activeCourses.length)} دوره فعال`,
        },
      ],
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            title: nextLesson.title,
            day: nextLesson.day,
            time: nextLesson.time,
            dateLabel: nextLesson.dateLabel,
            status: nextLesson.status,
          }
        : null,
      lastLesson: lastHeld
        ? {
            id: lastHeld.id,
            title: lastHeld.title,
            day: lastHeld.day,
            time: lastHeld.time,
            dateLabel: lastHeld.dateLabel,
            status: lastHeld.status,
          }
        : null,
      currentSession: currentSession
        ? this.mapSession(
            currentSession,
            currentSession._count.slides,
            0,
            currentSession._count.attachments,
            primaryEnrollment?.course.timeShort ?? '',
            undefined,
            currentAttendance,
            homeworkCursor,
            currentSession._count.exercises,
            courseUnlocksByClassHeld(primaryEnrollment?.course ?? {}),
          )
        : null,
      schedulePreview: scheduleWindow.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        day: lesson.day,
        time: lesson.time,
        dateLabel: lesson.dateLabel,
        status: lesson.status,
      })),
      practiceTips: tips.map((tip) => tip.text),
      slideCount: currentSession?._count.slides ?? 0,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'asc' },
        },
        enrollments: { include: { course: true } },
      },
    });

    const homeworkByCourse = await this.lastHomeworkByCourse(
      userId,
      user.enrollments.map((e) => e.courseId),
    );
    const courses = await Promise.all(
      user.enrollments.map((e) =>
        this.mapCourseWithProgress(
          e.course,
          e.classDays,
          homeworkByCourse.get(e.courseId) ?? 0,
        ),
      ),
    );
    const primary = courses.find((c) => c.status === 'active') ?? courses[0];
    const sessionsDone = courses.reduce((sum, c) => sum + c.sessionsDone, 0);

    return {
      student: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        studentCode: user.studentCode,
        level: normalizeStudentLevel(user.level),
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        nationalId: user.nationalId,
        address: user.address,
        programTitle: primary?.title ?? 'هنرجوی اتود',
        attendanceRate: toPersianDigits(
          `${await this.studentAttendanceRate(userId)}٪`,
        ),
        totalHours: toPersianDigits(sessionsDone),
        activeCoursesCount: toPersianDigits(
          courses.filter((c) => c.status === 'active').length,
        ),
        stars: await this.studentStars(
          userId,
          user.enrollments.find((item) => item.course.slug === primary?.id)
            ?.course.teacherId,
        ),
      },
      courses,
      primaryCourse: primary
        ? {
            teacher: primary.teacher,
            timeShort: primary.timeShort,
            certificateReady: primary.certificateReady,
          }
        : null,
      achievements: user.achievements.map((item) => ({
        id: item.achievement.code,
        title: item.achievement.title,
        desc: item.achievement.description,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const firstName = dto.firstName
      ? normalizeName(dto.firstName)
      : existing.firstName;
    const lastName = dto.lastName
      ? normalizeName(dto.lastName)
      : existing.lastName;

    if (dto.firstName || dto.lastName) {
      const duplicate = await this.prisma.user.findFirst({
        where: {
          firstName,
          lastName,
          NOT: { id: userId },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          'کاربر دیگری با این نام و نام خانوادگی وجود دارد.',
        );
      }
    }

    const passwordData = dto.password
      ? {
          passwordHash: await argon2.hash(dto.password),
          passwordPlain: dto.password,
        }
      : {};

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName || dto.lastName
          ? {
              firstName,
              lastName,
              displayName: `${firstName} ${lastName}`,
            }
          : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone.trim() || null }
          : {}),
        ...(dto.nationalId !== undefined
          ? { nationalId: dto.nationalId.trim() || null }
          : {}),
        ...(dto.address !== undefined
          ? { address: dto.address.trim() || null }
          : {}),
        ...passwordData,
      },
    });

    if (dto.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.getProfile(userId);
  }

  async getCertificate(userId: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findPrimaryCourse(userId);
    return {
      courseId: course.slug,
      ready: course.certificateReady,
      downloadUrl: course.certificateReady
        ? `/api/v1/courses/${course.slug}/certificate/download`
        : null,
    };
  }

  /** Updates avatar and returns previous path (if any). */
  async setAvatarUrl(userId: string, avatarUrl: string | null) {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return existing.avatarUrl;
  }

  async updateSessionProgress(
    userId: string,
    idOrNumber: string,
    lastSlideIndex: number,
    courseId?: string,
  ) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);

    await this.assertSessionVisible(userId, session, course);

    const slideCount = await this.prisma.slide.count({
      where: { sessionId: session.id },
    });
    const clamped = Math.max(
      0,
      Math.min(lastSlideIndex, Math.max(slideCount - 1, 0)),
    );
    const existing = await this.prisma.sessionProgress.findUnique({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
    });
    const farthest = Math.max(existing?.lastSlideIndex ?? 0, clamped);
    const completed =
      existing?.completedAt ??
      (slideCount > 0 && farthest >= slideCount - 1 ? new Date() : null);

    const progress = await this.prisma.sessionProgress.upsert({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
      create: {
        userId,
        sessionId: session.id,
        lastSlideIndex: farthest,
        completedAt: completed,
      },
      update: {
        lastSlideIndex: farthest,
        ...(completed ? { completedAt: completed } : {}),
      },
    });

    return {
      sessionId: String(session.number),
      lastSlideIndex: progress.lastSlideIndex,
      slideCount,
      progressPercent: slideProgressPercent(
        progress.lastSlideIndex,
        slideCount,
        progress.completedAt,
      ),
      completedAt: progress.completedAt,
    };
  }

  async getSessionProgress(
    userId: string,
    idOrNumber: string,
    courseId?: string,
  ) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);
    const slideCount = await this.prisma.slide.count({
      where: { sessionId: session.id },
    });
    const row = await this.prisma.sessionProgress.findUnique({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
    });
    const lastSlideIndex = row?.lastSlideIndex ?? 0;
    return {
      sessionId: String(session.number),
      lastSlideIndex,
      slideCount,
      progressPercent: row
        ? slideProgressPercent(lastSlideIndex, slideCount, row.completedAt)
        : 0,
      completedAt: row?.completedAt ?? null,
    };
  }

  /**
   * Sliding window from CourseSessions: last AVAILABLE + next upcoming.
   * Falls back to ScheduleLesson metadata for title/date when present.
   */
  private async buildScheduleWindow(
    courseId: string,
    courseMeta: {
      teacher: string;
      day: string;
      time: string;
      room: string;
      duration: string;
    },
  ): Promise<ScheduleWindowItem[]> {
    const all = await this.buildFullScheduleFromSessions(courseId, courseMeta);
    if (all.length === 0) return [];

    let lastDoneIdx = -1;
    for (let i = 0; i < all.length; i += 1) {
      if (all[i].status === 'done') lastDoneIdx = i;
    }
    const nextIdx = all.findIndex((l) => l.status === 'next');

    if (lastDoneIdx >= 0 && nextIdx >= 0) {
      return [all[lastDoneIdx], all[nextIdx]];
    }
    if (lastDoneIdx >= 0) {
      const following = all[lastDoneIdx + 1];
      return following ? [all[lastDoneIdx], following] : [all[lastDoneIdx]];
    }
    if (nextIdx >= 0) {
      const following = all[nextIdx + 1];
      return following ? [all[nextIdx], following] : [all[nextIdx]];
    }
    return all.slice(0, 2);
  }

  private async buildFullScheduleFromSessions(
    courseId: string,
    courseMeta: {
      teacher: string;
      day: string;
      time: string;
      room: string;
      duration: string;
    },
  ): Promise<ScheduleWindowItem[]> {
    const [sessions, lessons] = await Promise.all([
      this.prisma.courseSession.findMany({
        where: { courseId },
        orderBy: { number: 'asc' },
      }),
      this.prisma.scheduleLesson.findMany({
        where: { courseId },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    let lastAvailableNumber = 0;
    for (const session of sessions) {
      if (session.status === SessionStatus.AVAILABLE) {
        lastAvailableNumber = Math.max(lastAvailableNumber, session.number);
      }
    }

    return sessions.map((session, index) => {
      const linked =
        lessons.find((l) => l.sessionId === session.id) ??
        lessons.find((l) => l.sortOrder === session.number) ??
        lessons[index];

      let status: 'done' | 'next' | 'planned' = 'planned';
      if (session.number <= lastAvailableNumber) {
        status = 'done';
      } else if (session.number === lastAvailableNumber + 1) {
        status = 'next';
      } else if (lastAvailableNumber === 0 && session.number === 1) {
        status = 'next';
      }

      const title =
        linked?.title ||
        (session.title
          ? `جلسۀ ${toPersianDigits(session.number)} — ${session.title}`
          : `جلسۀ ${toPersianDigits(session.number)}`);

      const dateLabel =
        session.dateLabel &&
        session.dateLabel !== 'قفل' &&
        session.dateLabel !== '—'
          ? session.dateLabel
          : linked?.dateLabel && linked.dateLabel !== 'جلسهٔ بعدی'
            ? linked.dateLabel
            : '—';

      const time =
        formatTimeRange(session.timeStart, session.timeEnd) ||
        linked?.time ||
        courseMeta.time;

      return {
        id: linked?.id ?? session.id,
        title,
        day: linked?.day ?? courseMeta.day,
        time,
        dateLabel,
        room: linked?.room ?? courseMeta.room,
        teacher: linked?.teacher ?? courseMeta.teacher,
        duration: linked?.duration ?? courseMeta.duration,
        note:
          status === 'done'
            ? linked?.note ?? 'برگزار شده · اسلایدها آماده است'
            : status === 'next'
              ? 'جلسه بعدی'
              : 'برنامه آینده',
        status,
        sessionId: session.id,
      };
    });
  }

  private async findPrimaryCourse(userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: { isActive: true, status: CourseStatus.ACTIVE },
      },
      include: { course: true },
      orderBy: { joinedAt: 'asc' },
    });
    if (enrollment) return enrollment.course;

    const any = await this.prisma.enrollment.findFirst({
      where: { userId, course: { isActive: true } },
      include: { course: true },
      orderBy: { joinedAt: 'asc' },
    });
    if (!any) {
      throw new NotFoundException('دوره‌ای برای این هنرجو یافت نشد.');
    }
    return any.course;
  }

  private async findEnrolledCourse(userId: string, idOrSlug: string) {
    // API returns course.id as slug; Postgres UUID columns reject non-UUID in OR
    const course = await this.prisma.course.findFirst({
      where: {
        ...courseIdentityWhere(idOrSlug),
        isActive: true,
        enrollments: { some: { userId } },
      },
    });
    if (!course) {
      throw new NotFoundException('دوره یافت نشد یا دسترسی ندارید.');
    }
    return course;
  }

  private async findCourseForSession(userId: string, idOrNumber: string) {
    if (/^\d+$/.test(idOrNumber)) {
      return this.findPrimaryCourse(userId);
    }
    if (!isUuid(idOrNumber)) {
      throw new NotFoundException('جلسه یافت نشد.');
    }
    const session = await this.prisma.courseSession.findFirst({
      where: {
        id: idOrNumber,
        course: { enrollments: { some: { userId } } },
      },
      include: { course: true },
    });
    if (!session) {
      throw new NotFoundException('جلسه یافت نشد.');
    }
    return session.course;
  }

  private async findSession(courseId: string, idOrNumber: string) {
    if (/^\d+$/.test(idOrNumber)) {
      const byNumber = await this.prisma.courseSession.findFirst({
        where: { courseId, number: Number(idOrNumber) },
      });
      if (!byNumber) {
        throw new NotFoundException('جلسه یافت نشد.');
      }
      return byNumber;
    }

    if (!isUuid(idOrNumber)) {
      throw new NotFoundException('جلسه یافت نشد.');
    }

    const session = await this.prisma.courseSession.findFirst({
      where: { courseId, id: idOrNumber },
    });

    if (!session) {
      throw new NotFoundException('جلسه یافت نشد.');
    }
    return session;
  }

  private async enrollmentClassDays(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { classDays: true, course: { select: { days: true, day: true } } },
    });
    if (!enrollment) return [];
    return assignedDays(
      enrollment.classDays,
      enrollment.course.days,
      enrollment.course.day,
    );
  }

  private async mapCourseWithProgress(
    course: {
      id: string;
      slug: string;
      title: string;
      subtitle: string;
      instrument: string;
      teacher: string;
      teacherShort: string;
      day: string;
      days?: string[];
      time: string;
      timeShort: string;
      duration: string;
      room: string;
      level: string;
      focus: string;
      sessionsTotal: number;
      weeklyHours: number;
      status: CourseStatus;
      certificateReady: boolean;
      accessNote: string | null;
    },
    classDays?: string[] | null,
    sessionsDone = 0,
  ) {
    const nextSession = await this.prisma.courseSession.findFirst({
      where: {
        courseId: course.id,
        status: { in: [SessionStatus.UPCOMING, SessionStatus.LOCKED] },
      },
      orderBy: { number: 'asc' },
      select: { timeStart: true, timeEnd: true },
    });
    const progress =
      course.sessionsTotal > 0
        ? Math.round((sessionsDone / course.sessionsTotal) * 100)
        : 0;
    const nextTime = formatTimeRange(
      nextSession?.timeStart,
      nextSession?.timeEnd,
      course.timeShort,
    );
    const courseDays = normalizeDays(course.days, course.day);
    const assigned = assignedDays(classDays, course.days, course.day);
    const dayLabel = joinDays(assigned, course.day);

    return {
      id: course.slug,
      uuid: course.id,
      title: course.title,
      subtitle: course.subtitle,
      instrument: course.instrument,
      teacher: course.teacher,
      teacherShort: course.teacherShort,
      day: dayLabel,
      days: courseDays,
      classDays: assigned,
      time: course.time,
      timeShort: course.timeShort,
      duration: course.duration,
      room: course.room,
      level: course.level,
      focus: course.focus,
      sessionsTotal: course.sessionsTotal,
      sessionsDone,
      progress,
      weeklyHours: course.weeklyHours,
      status: COURSE_STATUS_API[course.status],
      nextLesson: `${dayLabel} ${nextTime}`,
      accessNote: course.accessNote ?? undefined,
      certificateReady: course.certificateReady,
    };
  }

  private async sessionHasPublishedContent(sessionId: string) {
    const [slides, attachments, exercises] = await Promise.all([
      this.prisma.slide.count({ where: { sessionId } }),
      this.prisma.sessionAttachment.count({ where: { sessionId } }),
      this.prisma.sessionExercise.count({ where: { sessionId } }),
    ]);
    return slides + attachments + exercises > 0;
  }

  private async assertSessionVisible(
    userId: string,
    session: {
      id: string;
      status: SessionStatus;
      number: number;
      courseId: string;
    },
    course: { slug?: string | null; instrument?: string | null; title?: string | null },
  ) {
    const attendance = await this.sessionAttendanceForStudent(userId, [
      session.id,
    ]);
    if (courseUnlocksByClassHeld(course)) {
      if (attendance.has(session.id)) {
        return;
      }
      throw new NotFoundException('محتوای این جلسه هنوز در دسترس نیست.');
    }
    if (session.status === SessionStatus.AVAILABLE) {
      return;
    }
    const cursor = await this.lastHomeworkNumber(userId, session.courseId);
    if (cursor > 0 && session.number <= cursor) {
      return;
    }
    const homework = await this.sessionHomeworkForStudent(userId, [session.id]);
    if ((homework.get(session.id)?.length ?? 0) > 0) {
      return;
    }
    if (attendance.has(session.id)) {
      return;
    }
    if (await this.sessionHasPublishedContent(session.id)) {
      return;
    }
    throw new NotFoundException('محتوای این جلسه هنوز در دسترس نیست.');
  }

  private async lastHomeworkNumber(userId: string, courseId: string) {
    const map = await this.lastHomeworkByCourse(userId, [courseId]);
    return map.get(courseId) ?? 0;
  }

  private async lastHomeworkByCourse(userId: string, courseIds: string[]) {
    const result = new Map(courseIds.map((id) => [id, 0]));
    if (courseIds.length === 0) return result;
    const rows = await this.prisma.practiceAssignmentTarget.findMany({
      where: {
        studentId: userId,
        assignment: {
          OR: [
            { courseId: { in: courseIds } },
            { session: { courseId: { in: courseIds } } },
          ],
          sessionId: { not: null },
        },
      },
      select: {
        assignment: {
          select: {
            courseId: true,
            session: { select: { id: true, number: true, courseId: true } },
          },
        },
      },
    });
    const sessionIds = [
      ...new Set(
        rows
          .map((row) => row.assignment.session?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const marks = sessionIds.length
      ? await this.prisma.attendanceRecord.findMany({
          where: { studentId: userId, meetingKey: { in: sessionIds } },
        })
      : [];
    const held = new Set(
      marks.filter((item) => classWasHeld(item.status)).map((item) => item.meetingKey),
    );
    for (const row of rows) {
      const session = row.assignment.session;
      const courseId = row.assignment.courseId ?? session?.courseId ?? null;
      if (!courseId || !session) continue;
      const number = held.has(session.id)
        ? session.number
        : Math.max(session.number - 1, 1);
      result.set(courseId, Math.max(result.get(courseId) ?? 0, number));
    }
    return result;
  }

  private async sessionAttendanceForStudent(
    userId: string,
    sessionIds: string[],
  ) {
    const result = new Map<string, AttendanceStatus>();
    if (sessionIds.length === 0) return result;
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { studentId: userId, meetingKey: { in: sessionIds } },
    });
    for (const row of rows) result.set(row.meetingKey, row.status);
    return result;
  }

  private async sessionHomeworkForStudent(
    userId: string,
    sessionIds: string[],
  ) {
    const result = new Map<
      string,
      Array<{
        id: string;
        category: string;
        title: string;
        source: string;
        note: string;
        score: number;
      }>
    >();
    if (sessionIds.length === 0) return result;
    const requested = await this.prisma.courseSession.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, number: true, courseId: true },
    });
    const nextSessions = requested.length
      ? await this.prisma.courseSession.findMany({
          where: {
            OR: requested.map((item) => ({
              courseId: item.courseId,
              number: item.number + 1,
            })),
          },
          select: { id: true, number: true, courseId: true },
        })
      : [];
    const lookupIds = [
      ...new Set([...sessionIds, ...nextSessions.map((item) => item.id)]),
    ];
    const [rows, marks] = await Promise.all([
      this.prisma.practiceAssignmentTarget.findMany({
        where: {
          studentId: userId,
          assignment: { sessionId: { in: lookupIds } },
        },
        include: {
          assignment: {
            select: {
              sessionId: true,
              category: true,
              title: true,
              source: true,
              note: true,
              createdAt: true,
            },
          },
        },
        orderBy: { assignment: { createdAt: 'asc' } },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { studentId: userId, meetingKey: { in: lookupIds } },
      }),
    ]);
    const held = new Set(
      marks.filter((item) => classWasHeld(item.status)).map((item) => item.meetingKey),
    );
    const previousId = new Map<string, string>();
    for (const next of nextSessions) {
      const prev = requested.find(
        (item) =>
          item.courseId === next.courseId && item.number === next.number - 1,
      );
      if (prev) previousId.set(next.id, prev.id);
    }
    for (const row of rows) {
      const storedId = row.assignment.sessionId;
      if (!storedId) continue;
      const displayId =
        held.has(storedId) || !previousId.has(storedId)
          ? storedId
          : previousId.get(storedId)!;
      if (!sessionIds.includes(displayId)) continue;
      const list = result.get(displayId) ?? [];
      list.push({
        id: row.id,
        category: row.assignment.category,
        title: row.assignment.title,
        source: row.assignment.source,
        note: row.assignment.note,
        score: row.score,
      });
      result.set(displayId, list);
    }
    return result;
  }

  private mapSession(
    session: {
      id: string;
      number: number;
      title: string;
      summary: string;
      topics: string[];
      status: SessionStatus;
      durationLabel: string;
      dateLabel: string;
      timeStart?: string | null;
      timeEnd?: string | null;
      homeworkTitle?: string;
      homeworkSource?: string;
      homeworkNote?: string;
    },
    slideCount: number,
    progressPercent = 0,
    attachmentCount = 0,
    fallbackTime = '',
    personalHomework?: Array<{
      id: string;
      category: string;
      title: string;
      source: string;
      note: string;
      score: number;
    }>,
    attendance?: AttendanceStatus,
    cursor = 0,
    exerciseCount = 0,
    unlockByClassHeld = false,
  ) {
    const absent = attendance === AttendanceStatus.ABSENT;
    const hasHomework = !absent && (personalHomework?.length ?? 0) > 0;
    const attendanceMarked = Boolean(attendance);
    const hasContent =
      slideCount > 0 || attachmentCount > 0 || exerciseCount > 0;
    const unlocked = unlockByClassHeld
      ? classWasHeld(attendance)
      : session.status === SessionStatus.AVAILABLE ||
        (cursor > 0 && session.number <= cursor) ||
        hasHomework ||
        attendanceMarked ||
        hasContent;
    const status = unlocked
      ? SESSION_STATUS_API.AVAILABLE
      : SESSION_STATUS_API.LOCKED;
    const homework = absent ? [] : personalHomework ?? [];
    const first = homework[0];
    const homeworkTitle = first?.title || session.homeworkTitle || '';
    const homeworkSource = first?.source || session.homeworkSource || '';
    const homeworkNote = first?.note || session.homeworkNote || '';
    return {
      id: String(session.number),
      uuid: session.id,
      number: session.number,
      title: session.title,
      summary: session.summary,
      topics: session.topics,
      status,
      slideCount,
      attachmentCount,
      durationLabel: session.durationLabel,
      dateLabel: session.dateLabel,
      timeLabel: formatTimeRange(
        session.timeStart,
        session.timeEnd,
        fallbackTime,
      ),
      progressPercent,
      homeworkTitle,
      homeworkSource,
      homeworkNote,
      homework,
      attendanceStatus: attendance ? attendance.toLowerCase() : null,
      current: session.number === cursor,
    };
  }

  async downloadCertificate(userId: string, courseId: string) {
    const course = await this.findEnrolledCourse(userId, courseId);
    if (!course.certificateReady) {
      throw new ForbiddenException('مدرک این دوره هنوز آماده نیست.');
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>گواهی ${course.title}</title>
  <style>
    body { font-family: Tahoma, sans-serif; background: #f3f5f9; margin: 0; padding: 40px; }
    .card { max-width: 720px; margin: 0 auto; background: #fff; border: 8px solid #0047ff; padding: 48px; text-align: center; }
    h1 { color: #0b1a3d; margin: 0 0 8px; }
    p { color: #334155; line-height: 2; }
    .name { font-size: 28px; color: #0047ff; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <p>آکادمی تخصصی پیانو اتود</p>
    <h1>گواهی پایان دوره</h1>
    <p>این مدرک تأیید می‌کند که</p>
    <p class="name">${user.displayName}</p>
    <p>دورهٔ «${course.title}» را با موفقیت به پایان رسانده است.</p>
    <p>${course.teacher} · ${course.instrument}</p>
  </div>
</body>
</html>`;
    const buffer = Buffer.from(html, 'utf8');
    const filename = `etude-certificate-${course.slug}.html`;
    return new StreamableFile(buffer, {
      type: 'text/html; charset=utf-8',
      length: buffer.length,
      disposition: `attachment; filename="${filename}"`,
    });
  }

  private async studentStars(studentId: string, teacherId?: string | null) {
    if (teacherId) {
      const row = await this.prisma.studentStarRating.findUnique({
        where: { teacherId_studentId: { teacherId, studentId } },
      });
      return row?.stars ?? 0;
    }
    const rows = await this.prisma.studentStarRating.findMany({
      where: { studentId },
    });
    return rows.reduce((max, row) => Math.max(max, row.stars), 0);
  }

  private async studentAttendanceRate(userId: string) {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { studentId: userId },
    });
    if (rows.length === 0) return 100;
    const present = rows.filter(
      (row) =>
        row.status === AttendanceStatus.PRESENT ||
        row.status === AttendanceStatus.LATE,
    ).length;
    return Math.round((present / rows.length) * 100);
  }
}
