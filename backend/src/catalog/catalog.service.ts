import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CourseStatus,
  LessonStatus,
  SessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LESSON_STATUS_API,
  SESSION_STATUS_API,
  SLIDE_KIND_API,
  isUuid,
  toPersianDigits,
} from '../common/utils/mappers';
import {
  buildPaginationMeta,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

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

    const courses = await Promise.all(
      rows.map(async (course) => this.mapCourseWithProgress(course)),
    );

    return {
      data: { courses },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getCourse(userId: string, idOrSlug: string) {
    const course = await this.findEnrolledCourse(userId, idOrSlug);
    return this.mapCourseWithProgress(course);
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
        include: { _count: { select: { slides: true } } },
      }),
    ]);

    return {
      data: {
        course: await this.mapCourseWithProgress(course),
        sessions: rows.map((session) =>
          this.mapSession(session, session._count.slides),
        ),
      },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getSession(userId: string, idOrNumber: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findCourseForSession(userId, idOrNumber);
    const session = await this.findSession(course.id, idOrNumber);
    const slideCount = await this.prisma.slide.count({
      where: { sessionId: session.id },
    });
    return {
      ...this.mapSession(session, slideCount),
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

    if (session.status !== SessionStatus.AVAILABLE) {
      throw new NotFoundException('محتوای این جلسه هنوز در دسترس نیست.');
    }

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

  async getSchedule(userId: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findPrimaryCourse(userId);

    const [lessons, sessions, mapped] = await Promise.all([
      this.prisma.scheduleLesson.findMany({
        where: { courseId: course.id },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.courseSession.findMany({
        where: { courseId: course.id },
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          status: true,
          title: true,
          dateLabel: true,
        },
      }),
      this.mapCourseWithProgress(course),
    ]);

    return {
      course: mapped,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        course: course.title,
        teacher: lesson.teacher,
        day: lesson.day,
        dateLabel: lesson.dateLabel,
        time: lesson.time,
        room: lesson.room,
        type: lesson.type.toLowerCase(),
        duration: lesson.duration,
        note: lesson.note ?? undefined,
        status: LESSON_STATUS_API[lesson.status],
        sessionId: lesson.sessionId ?? undefined,
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        number: s.number,
        status: SESSION_STATUS_API[s.status],
        title: s.title,
        dateLabel: s.dateLabel,
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

    const courses = await Promise.all(
      enrollments.map((e) => this.mapCourseWithProgress(e.course)),
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

    const schedule = primaryEnrollment
      ? await this.prisma.scheduleLesson.findMany({
          where: { courseId: primaryEnrollment.courseId },
          orderBy: { sortOrder: 'asc' },
          take: 5,
        })
      : [];

    const firstSession = primaryEnrollment
      ? await this.prisma.courseSession.findFirst({
          where: { courseId: primaryEnrollment.courseId },
          orderBy: { number: 'asc' },
          include: { _count: { select: { slides: true } } },
        })
      : null;

    const avgProgress =
      activeCourses.length > 0
        ? Math.round(
            activeCourses.reduce((sum, c) => sum + c.progress, 0) /
              activeCourses.length,
          )
        : 0;

    const nextLesson =
      schedule.find((l) => l.status === LessonStatus.NEXT) ?? schedule[0];

    return {
      student: {
        displayName: user.displayName,
        studentCode: user.studentCode,
        level: user.level,
        avatarUrl: user.avatarUrl,
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
            status: LESSON_STATUS_API[nextLesson.status],
          }
        : null,
      currentSession: firstSession
        ? this.mapSession(firstSession, firstSession._count.slides)
        : null,
      schedulePreview: schedule.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        day: lesson.day,
        time: lesson.time,
        status: LESSON_STATUS_API[lesson.status],
      })),
      practiceTips: tips.map((tip) => tip.text),
      slideCount: firstSession?._count.slides ?? 0,
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

    const courses = await Promise.all(
      user.enrollments.map((e) => this.mapCourseWithProgress(e.course)),
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
        level: user.level ?? 'پایه',
        avatarUrl: user.avatarUrl,
        programTitle: primary?.title ?? 'هنرجوی اتود',
        attendanceRate: '۱۰۰٪',
        totalHours: toPersianDigits(sessionsDone),
        activeCoursesCount: toPersianDigits(
          courses.filter((c) => c.status === 'active').length,
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
        OR: isUuid(idOrSlug)
          ? [{ id: idOrSlug }, { slug: idOrSlug }]
          : [{ slug: idOrSlug }],
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

  private async mapCourseWithProgress(course: {
    id: string;
    slug: string;
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
    weeklyHours: number;
    status: CourseStatus;
    certificateReady: boolean;
    accessNote: string | null;
  }) {
    const sessionsDone = await this.prisma.courseSession.count({
      where: { courseId: course.id, status: SessionStatus.AVAILABLE },
    });
    const progress =
      course.sessionsTotal > 0
        ? Math.round((sessionsDone / course.sessionsTotal) * 100)
        : 0;

    return {
      id: course.slug,
      uuid: course.id,
      title: course.title,
      subtitle: course.subtitle,
      instrument: course.instrument,
      teacher: course.teacher,
      teacherShort: course.teacherShort,
      day: course.day,
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
      nextLesson: `${course.day} ${course.timeShort}`,
      accessNote: course.accessNote ?? undefined,
      certificateReady: course.certificateReady,
    };
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
    },
    slideCount: number,
  ) {
    return {
      id: String(session.number),
      uuid: session.id,
      number: session.number,
      title: session.title,
      summary: session.summary,
      topics: session.topics,
      status: SESSION_STATUS_API[session.status],
      slideCount,
      durationLabel: session.durationLabel,
      dateLabel: session.dateLabel,
    };
  }
}
