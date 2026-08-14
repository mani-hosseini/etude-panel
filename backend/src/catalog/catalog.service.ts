import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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
  toPersianDigits,
} from '../common/utils/mappers';
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
        include: { _count: { select: { slides: true, attachments: true } } },
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

    return {
      data: {
        course: await this.mapCourseWithProgress(course),
        sessions: rows.map((session) => {
          const progress = progressBySession.get(session.id);
          const slideCount = session._count.slides;
          const percent =
            progress && slideCount > 0
              ? Math.round(
                  ((progress.lastSlideIndex + 1) / slideCount) * 100,
                )
              : 0;
          return this.mapSession(
            session,
            slideCount,
            percent,
            session._count.attachments,
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
    const [slideCount, attachmentCount] = await Promise.all([
      this.prisma.slide.count({ where: { sessionId: session.id } }),
      this.prisma.sessionAttachment.count({
        where: { sessionId: session.id },
      }),
    ]);
    return {
      ...this.mapSession(session, slideCount, 0, attachmentCount),
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

  async getSessionAttachments(
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

  async getSchedule(userId: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findPrimaryCourse(userId);

    const courseMeta = {
      teacher: course.teacher,
      day: course.day,
      time: course.timeShort,
      room: course.room,
      duration: course.duration,
    };

    const [lessons, sessions, mapped] = await Promise.all([
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
        },
      }),
      this.mapCourseWithProgress(course),
    ]);

    return {
      course: mapped,
      lessons,
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

    const scheduleWindow = primaryEnrollment
      ? await this.buildScheduleWindow(primaryEnrollment.courseId, {
          teacher: primaryEnrollment.course.teacher,
          day: primaryEnrollment.course.day,
          time: primaryEnrollment.course.timeShort,
          room: primaryEnrollment.course.room,
          duration: primaryEnrollment.course.duration,
        })
      : [];

    const currentSession = primaryEnrollment
      ? await this.prisma.courseSession.findFirst({
          where: {
            courseId: primaryEnrollment.courseId,
            status: SessionStatus.AVAILABLE,
          },
          orderBy: { number: 'desc' },
          include: { _count: { select: { slides: true, attachments: true } } },
        })
      : null;

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
        phone: user.phone,
        nationalId: user.nationalId,
        address: user.address,
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
        ...(dto.level !== undefined ? { level: dto.level.trim() || null } : {}),
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

    if (session.status !== SessionStatus.AVAILABLE) {
      throw new NotFoundException('این جلسه هنوز برای ثبت پیشرفت فعال نیست.');
    }

    const slideCount = await this.prisma.slide.count({
      where: { sessionId: session.id },
    });
    const clamped = Math.max(
      0,
      Math.min(lastSlideIndex, Math.max(slideCount - 1, 0)),
    );
    const completed =
      slideCount > 0 && clamped >= slideCount - 1 ? new Date() : null;

    const progress = await this.prisma.sessionProgress.upsert({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
      create: {
        userId,
        sessionId: session.id,
        lastSlideIndex: clamped,
        completedAt: completed,
      },
      update: {
        lastSlideIndex: clamped,
        ...(completed ? { completedAt: completed } : {}),
      },
    });

    const percent =
      slideCount > 0
        ? Math.round(((progress.lastSlideIndex + 1) / slideCount) * 100)
        : 0;

    return {
      sessionId: String(session.number),
      lastSlideIndex: progress.lastSlideIndex,
      slideCount,
      progressPercent: percent,
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
    const percent =
      slideCount > 0
        ? Math.round(((lastSlideIndex + 1) / slideCount) * 100)
        : 0;
    return {
      sessionId: String(session.number),
      lastSlideIndex,
      slideCount,
      progressPercent: row ? percent : 0,
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
        linked?.dateLabel && linked.dateLabel !== 'جلسهٔ بعدی'
          ? linked.dateLabel
          : session.dateLabel && session.dateLabel !== 'قفل'
            ? session.dateLabel
            : '—';

      return {
        id: linked?.id ?? session.id,
        title,
        day: linked?.day ?? courseMeta.day,
        time: linked?.time ?? courseMeta.time,
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
    progressPercent = 0,
    attachmentCount = 0,
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
      attachmentCount,
      durationLabel: session.durationLabel,
      dateLabel: session.dateLabel,
      progressPercent,
    };
  }
}
