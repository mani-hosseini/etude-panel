import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, SessionStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  SESSION_STATUS_API,
  SLIDE_KIND_API,
  isUuid,
  normalizeAddress,
  normalizeName,
  normalizeNationalId,
  normalizePhone,
  toAsciiDigits,
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

    const progressBySession = await this.getProgressMap(
      userId,
      rows.map((row) => row.id),
    );

    return {
      data: {
        course: await this.mapCourseWithProgress(course),
        sessions: rows.map((session) =>
          this.mapSession(
            session,
            session._count.slides,
            progressBySession.get(session.id),
          ),
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
    const progress = await this.prisma.sessionProgress.findUnique({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
    });
    return {
      ...this.mapSession(session, slideCount, progress),
      courseId: course.slug,
      courseTitle: this.cleanCourseTitle(course.title),
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

    const [slides, progress] = await Promise.all([
      this.prisma.slide.findMany({
        where: { sessionId: session.id },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.sessionProgress.findUnique({
        where: {
          userId_sessionId: { userId, sessionId: session.id },
        },
      }),
    ]);

    const total = slides.length;
    const mappedProgress = this.mapViewProgress(progress, total);

    return {
      courseId: course.slug,
      courseTitle: this.cleanCourseTitle(course.title),
      sessionId: session.id,
      sessionNumber: session.number,
      total,
      progress: mappedProgress,
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
      throw new NotFoundException('محتوای این جلسه هنوز در دسترس نیست.');
    }

    const total = await this.prisma.slide.count({
      where: { sessionId: session.id },
    });
    if (total === 0) {
      return {
        lastSlideIndex: 0,
        viewProgress: 0,
        viewed: false,
        completedAt: null,
      };
    }

    const safeIndex = Math.max(0, Math.min(lastSlideIndex, total - 1));
    const existing = await this.prisma.sessionProgress.findUnique({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
    });

    const nextIndex = Math.max(existing?.lastSlideIndex ?? 0, safeIndex);
    const justCompleted = nextIndex >= total - 1;
    const completedAt =
      existing?.completedAt ?? (justCompleted ? new Date() : null);

    if (
      existing &&
      existing.lastSlideIndex === nextIndex &&
      Boolean(existing.completedAt) === justCompleted
    ) {
      return this.mapViewProgress(existing, total);
    }

    const updated = await this.prisma.sessionProgress.upsert({
      where: {
        userId_sessionId: { userId, sessionId: session.id },
      },
      create: {
        userId,
        sessionId: session.id,
        lastSlideIndex: nextIndex,
        completedAt,
      },
      update: {
        lastSlideIndex: nextIndex,
        ...(completedAt && !existing?.completedAt
          ? { completedAt }
          : {}),
      },
    });

    return this.mapViewProgress(updated, total);
  }

  async getSchedule(userId: string, courseId?: string) {
    const course = courseId
      ? await this.findEnrolledCourse(userId, courseId)
      : await this.findPrimaryCourse(userId);

    const [scheduleRows, sessions, mapped] = await Promise.all([
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
          durationLabel: true,
        },
      }),
      this.mapCourseWithProgress(course),
    ]);

    const allLessons = this.buildLessonsFromSessions(
      sessions,
      scheduleRows,
      course,
    );

    return {
      course: mapped,
      lessons: this.pickProgressWindow(allLessons, 2),
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

    const [scheduleRows, courseSessions] = primaryEnrollment
      ? await Promise.all([
          this.prisma.scheduleLesson.findMany({
            where: { courseId: primaryEnrollment.courseId },
            orderBy: { sortOrder: 'asc' },
          }),
          this.prisma.courseSession.findMany({
            where: { courseId: primaryEnrollment.courseId },
            orderBy: { number: 'asc' },
            select: {
              id: true,
              number: true,
              status: true,
              title: true,
              summary: true,
              topics: true,
              dateLabel: true,
              durationLabel: true,
              _count: { select: { slides: true } },
            },
          }),
        ])
      : [[], []];

    const allLessons = primaryEnrollment
      ? this.buildLessonsFromSessions(
          courseSessions,
          scheduleRows,
          primaryEnrollment.course,
        )
      : [];

    const schedulePreview = this.pickProgressWindow(allLessons, 2).map(
      (lesson) => ({
        id: lesson.id,
        title: lesson.title,
        day: lesson.day,
        time: lesson.time,
        dateLabel: lesson.dateLabel,
        status: lesson.status as 'done' | 'next' | 'planned',
      }),
    );

    const nextLesson =
      allLessons.find((l) => l.status === 'next') ??
      allLessons.find((l) => l.status === 'planned') ??
      null;
    const lastHeldLesson =
      [...allLessons].reverse().find((l) => l.status === 'done') ?? null;

    const lastHeldSession =
      [...courseSessions]
        .reverse()
        .find((s) => s.status === SessionStatus.AVAILABLE) ?? null;

    const lastHeldDateLabel = this.pickLastHeldDateLabel(courseSessions);

    const avgProgress =
      activeCourses.length > 0
        ? Math.round(
            activeCourses.reduce((sum, c) => sum + c.progress, 0) /
              activeCourses.length,
          )
        : 0;

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
      lastHeldLesson: lastHeldLesson
        ? {
            id: lastHeldLesson.id,
            title: lastHeldLesson.title,
            day: lastHeldLesson.day,
            time: lastHeldLesson.time,
            dateLabel: lastHeldDateLabel ?? lastHeldLesson.dateLabel,
          }
        : lastHeldDateLabel
          ? {
              id: lastHeldSession?.id ?? 'last-held',
              title: lastHeldSession?.title
                ? `جلسهٔ ${this.persianSessionOrdinal(lastHeldSession.number)} — ${lastHeldSession.title}`
                : lastHeldSession
                  ? `جلسهٔ ${this.persianSessionOrdinal(lastHeldSession.number)}`
                  : 'آخرین جلسه',
              day: primaryEnrollment?.course.day ?? '',
              time: primaryEnrollment?.course.time ?? '',
              dateLabel: lastHeldDateLabel,
            }
          : null,
      currentSession: lastHeldSession
        ? this.mapSession(lastHeldSession, lastHeldSession._count.slides)
        : null,
      schedulePreview,
      practiceTips: tips.map((tip) => tip.text),
      slideCount: lastHeldSession?._count.slides ?? 0,
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
        programTitle: this.cleanCourseTitle(primary?.title ?? 'هنرجوی اتود'),
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

  async updateProfile(
    userId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      level?: string;
      phone?: string;
      nationalId?: string;
      address?: string;
      password?: string;
    },
  ) {
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
          'حسابی با این نام و نام خانوادگی از قبل وجود دارد.',
        );
      }
    }

    const phone =
      dto.phone !== undefined ? normalizePhone(dto.phone) : undefined;
    const nationalId =
      dto.nationalId !== undefined
        ? normalizeNationalId(dto.nationalId)
        : undefined;
    const address =
      dto.address !== undefined ? normalizeAddress(dto.address) : undefined;

    if (phone !== undefined && phone !== null && !/^09\d{9}$/.test(phone)) {
      throw new BadRequestException(
        'شماره تلفن باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
      );
    }
    if (
      nationalId !== undefined &&
      nationalId !== null &&
      !/^\d{10}$/.test(nationalId)
    ) {
      throw new BadRequestException('کد ملی باید ۱۰ رقم باشد.');
    }

    if (phone) {
      const duplicatePhone = await this.prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
      });
      if (duplicatePhone) {
        throw new ConflictException('این شماره تلفن قبلاً ثبت شده است.');
      }
    }
    if (nationalId) {
      const duplicateNationalId = await this.prisma.user.findFirst({
        where: { nationalId, NOT: { id: userId } },
      });
      if (duplicateNationalId) {
        throw new ConflictException('این کد ملی قبلاً ثبت شده است.');
      }
    }

    const data: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      level?: string | null;
      phone?: string | null;
      nationalId?: string | null;
      address?: string | null;
      passwordHash?: string;
    } = {};

    if (dto.firstName || dto.lastName) {
      data.firstName = firstName;
      data.lastName = lastName;
      data.displayName = `${firstName} ${lastName}`;
    }
    if (dto.level !== undefined) {
      data.level = dto.level.trim() || null;
    }
    if (phone !== undefined) {
      data.phone = phone;
    }
    if (nationalId !== undefined) {
      data.nationalId = nationalId;
    }
    if (address !== undefined) {
      data.address = address;
    }
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    if (dto.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      displayName: updated.displayName,
      level: updated.level,
      studentCode: updated.studentCode,
      avatarUrl: updated.avatarUrl,
      phone: updated.phone,
      nationalId: updated.nationalId,
      address: updated.address,
    };
  }

  private buildLessonsFromSessions(
    sessions: Array<{
      id: string;
      number: number;
      status: SessionStatus;
      title: string;
      dateLabel: string;
      durationLabel?: string;
    }>,
    scheduleRows: Array<{
      id: string;
      sessionId: string | null;
      title: string;
      teacher: string;
      day: string;
      dateLabel: string;
      time: string;
      room: string;
      type: { toLowerCase?: () => string } | string;
      duration: string;
      note: string | null;
      sortOrder: number;
    }>,
    course: {
      title: string;
      teacher: string;
      day: string;
      time: string;
      room: string;
      duration: string;
    },
  ) {
    const bySessionId = new Map(
      scheduleRows
        .filter((row) => row.sessionId)
        .map((row) => [row.sessionId!, row]),
    );

    const lastHeldNumber =
      [...sessions]
        .reverse()
        .find((s) => s.status === SessionStatus.AVAILABLE)?.number ?? 0;

    const hasUpcoming = sessions.some(
      (s) => s.status === SessionStatus.UPCOMING,
    );

    return sessions.map((session) => {
      const row = bySessionId.get(session.id);
      let status: 'done' | 'next' | 'planned';
      if (session.status === SessionStatus.AVAILABLE) {
        status = 'done';
      } else if (session.status === SessionStatus.UPCOMING) {
        status = 'next';
      } else if (
        !hasUpcoming &&
        session.status === SessionStatus.LOCKED &&
        session.number === lastHeldNumber + 1
      ) {
        status = 'next';
      } else {
        status = 'planned';
      }

      const dateLabel = this.resolveDateLabel(
        session.dateLabel,
        row?.dateLabel,
        status,
      );

      const ordinal = this.persianSessionOrdinal(session.number);
      const title =
        row?.title?.trim() ||
        (session.title.trim()
          ? `جلسهٔ ${ordinal} — ${session.title.trim()}`
          : `جلسهٔ ${ordinal}`);

      const note =
        row?.note ??
        (status === 'done'
          ? 'برگزار شده · اسلایدها آماده است'
          : status === 'next'
            ? 'محتوا پس از برگزاری جلسه فعال می‌شود'
            : undefined);

      const lessonType =
        typeof row?.type === 'string'
          ? row.type.toLowerCase()
          : row?.type && typeof row.type.toLowerCase === 'function'
            ? row.type.toLowerCase()
            : 'theory';

      return {
        id: row?.id ?? session.id,
        title,
        course: course.title,
        teacher: row?.teacher ?? course.teacher,
        day: row?.day ?? course.day,
        dateLabel,
        time: row?.time ?? course.time,
        room: row?.room ?? course.room,
        type: lessonType,
        duration: row?.duration ?? session.durationLabel ?? course.duration,
        note,
        status,
        sessionId: session.id,
        sessionNumber: session.number,
      };
    });
  }

  /** Last held session + next upcoming (falls back to last two held). */
  private pickProgressWindow<
    T extends { status: string; sessionNumber?: number },
  >(lessons: T[], limit = 2): T[] {
    if (lessons.length === 0) return [];

    const held = lessons.filter((l) => l.status === 'done');
    const next = lessons.find((l) => l.status === 'next');
    const window: T[] = [];

    if (held.length > 0) {
      window.push(held[held.length - 1]!);
    }
    if (next) {
      window.push(next);
    } else if (held.length >= 2) {
      return held.slice(-limit);
    }

    if (window.length < limit && held.length >= 2) {
      window.unshift(held[held.length - 2]!);
    }

    if (window.length === 0) {
      return lessons.slice(0, limit);
    }

    return window.slice(0, limit);
  }

  /** Last held session date from CourseSession (skips invalid placeholders). */
  private pickLastHeldDateLabel(
    sessions: Array<{ status: SessionStatus; dateLabel: string }>,
  ): string | null {
    const held = [...sessions]
      .reverse()
      .filter((s) => s.status === SessionStatus.AVAILABLE);

    for (const session of held) {
      const label = session.dateLabel?.trim();
      if (label && this.isValidCalendarDateLabel(label)) {
        return label;
      }
    }
    return null;
  }

  private isValidCalendarDateLabel(value: string): boolean {
    const ascii = toAsciiDigits(value).trim();
    const match = ascii.match(/^(\d{3,4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1300 || year > 1499) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }

  private resolveDateLabel(
    sessionDate: string | undefined,
    scheduleDate: string | undefined,
    status: 'done' | 'next' | 'planned',
  ): string {
    const placeholders = new Set([
      '',
      'قفل',
      'جلسهٔ بعدی',
      'جلسۀ بعدی',
      'پنج‌شنبهٔ بعد',
      'پنجشنبهٔ بعد',
    ]);

    const isReal = (value?: string) => {
      const v = value?.trim() ?? '';
      if (!v || placeholders.has(v)) return false;
      if (this.isValidCalendarDateLabel(v)) return true;
      // Non-date labels (e.g. «پنج‌شنبهٔ بعد») only for upcoming
      if (/\d/.test(toAsciiDigits(v)) || /[۰-۹]/.test(v)) return false;
      return status === 'done' ? false : v.length > 0;
    };

    if (isReal(sessionDate)) return sessionDate!.trim();
    if (isReal(scheduleDate)) return scheduleDate!.trim();
    if (status === 'next') return 'جلسهٔ بعدی';
    return '—';
  }

  private persianSessionOrdinal(n: number): string {
    const ordinals = [
      '',
      'اول',
      'دوم',
      'سوم',
      'چهارم',
      'پنجم',
      'ششم',
      'هفتم',
      'هشتم',
      'نهم',
      'دهم',
      'یازدهم',
      'دوازدهم',
    ];
    return ordinals[n] ?? toPersianDigits(n);
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
      title: this.cleanCourseTitle(course.title),
      subtitle: course.subtitle,
      instrument: course.instrument,
      teacher: course.teacher,
      teacherShort: course.teacherShort,
      day: course.day,
      time: course.time,
      timeShort: course.timeShort,
      duration: course.duration,
      room: course.room,
      level: '',
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

  private cleanCourseTitle(title: string): string {
    return title
      .replace(/\s*[—\-–]\s*سطح\s*پایه\s*/g, '')
      .replace(/\s*سطح\s*پایه\s*/g, '')
      .trim();
  }

  private async getProgressMap(userId: string, sessionIds: string[]) {
    if (sessionIds.length === 0) {
      return new Map<
        string,
        { lastSlideIndex: number; completedAt: Date | null }
      >();
    }
    const rows = await this.prisma.sessionProgress.findMany({
      where: { userId, sessionId: { in: sessionIds } },
      select: {
        sessionId: true,
        lastSlideIndex: true,
        completedAt: true,
      },
    });
    return new Map(
      rows.map((row) => [
        row.sessionId,
        {
          lastSlideIndex: row.lastSlideIndex,
          completedAt: row.completedAt,
        },
      ]),
    );
  }

  private mapViewProgress(
    progress:
      | { lastSlideIndex: number; completedAt: Date | null }
      | null
      | undefined,
    slideCount: number,
  ) {
    if (!progress) {
      return {
        lastSlideIndex: 0,
        viewProgress: 0,
        viewed: false,
        completedAt: null as string | null,
      };
    }

    const lastSlideIndex = progress.lastSlideIndex;
    const viewed =
      Boolean(progress.completedAt) ||
      (slideCount > 0 && lastSlideIndex >= slideCount - 1);
    const viewProgress =
      slideCount > 0
        ? Math.min(
            100,
            Math.round(((lastSlideIndex + 1) / slideCount) * 100),
          )
        : 0;

    return {
      lastSlideIndex,
      viewProgress: viewed ? 100 : viewProgress,
      viewed,
      completedAt: progress.completedAt?.toISOString() ?? null,
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
    progress?: {
      lastSlideIndex: number;
      completedAt: Date | null;
    } | null,
  ) {
    const view = this.mapViewProgress(progress, slideCount);
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
      viewProgress: view.viewProgress,
      viewed: view.viewed,
      lastSlideIndex: view.lastSlideIndex,
    };
  }
}
