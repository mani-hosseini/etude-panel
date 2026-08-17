import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseStatus,
  LessonStatus,
  LessonType,
  Prisma,
  SessionStatus,
  SlideKind,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatTimeRange,
  normalizeClock,
} from '../common/utils/session-time';
import {
  buildPaginationMeta,
} from '../common/dto/pagination-query.dto';
import {
  AdminListCoursesQueryDto,
  CreateSessionDto,
  CreateSlideDto,
  ReorderAttachmentsDto,
  ReorderSlidesDto,
  UpdateAttachmentDto,
  UpsertCourseDto,
  UpsertPracticeTipDto,
  UpsertScheduleDto,
  UpsertSessionDto,
  UpsertSlideDto,
} from './dto/admin-catalog.dto';

function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || `course-${Date.now()}`;
}

@Injectable()
export class AdminCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(query: AdminListCoursesQueryDto) {
    const where: Prisma.CourseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { teacher: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: {
            select: { sessions: true, enrollments: true, lessons: true },
          },
        },
      }),
    ]);

    return {
      data: {
        courses: rows.map((course) => this.mapCourse(course)),
      },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getCourse(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const course = await this.prisma.course.findUnique({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        _count: {
          select: { sessions: true, enrollments: true, lessons: true },
        },
        sessions: {
          orderBy: { number: 'asc' },
          include: {
            _count: { select: { slides: true, attachments: true } },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('دوره یافت نشد.');
    return {
      ...this.mapCourse(course),
      sessions: course.sessions.map((s) => this.mapSession(s)),
    };
  }

  async createCourse(dto: UpsertCourseDto) {
    let slug = dto.slug?.trim() || slugify(dto.title);
    const exists = await this.prisma.course.findUnique({ where: { slug } });
    if (exists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const course = await this.prisma.course.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        instrument: dto.instrument,
        teacher: dto.teacher,
        teacherShort: dto.teacherShort,
        day: dto.day,
        time: dto.time,
        timeShort: dto.timeShort,
        duration: dto.duration,
        room: dto.room,
        level: dto.level,
        focus: dto.focus,
        sessionsTotal: dto.sessionsTotal,
        weeklyHours: dto.weeklyHours ?? 2,
        status: dto.status ?? CourseStatus.ACTIVE,
        certificateReady: dto.certificateReady ?? false,
        accessNote: dto.accessNote,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        _count: {
          select: { sessions: true, enrollments: true, lessons: true },
        },
      },
    });

    const sessionCreates = Array.from(
      { length: dto.sessionsTotal },
      (_, i) => ({
        courseId: course.id,
        number: i + 1,
        title: '',
        summary: 'محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.',
        topics: [] as string[],
        status: SessionStatus.LOCKED,
        durationLabel: dto.duration,
        dateLabel: 'قفل',
      }),
    );
    if (sessionCreates.length > 0) {
      await this.prisma.courseSession.createMany({ data: sessionCreates });
    }

    return this.getCourse(course.id);
  }

  async updateCourse(id: string, dto: UpsertCourseDto) {
    await this.ensureCourse(id);
    if (dto.slug) {
      const clash = await this.prisma.course.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('اسلاگ دوره تکراری است.');
      }
    }

    await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        title: dto.title,
        subtitle: dto.subtitle,
        instrument: dto.instrument,
        teacher: dto.teacher,
        teacherShort: dto.teacherShort,
        day: dto.day,
        time: dto.time,
        timeShort: dto.timeShort,
        duration: dto.duration,
        room: dto.room,
        level: dto.level,
        focus: dto.focus,
        sessionsTotal: dto.sessionsTotal,
        ...(dto.weeklyHours !== undefined
          ? { weeklyHours: dto.weeklyHours }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.certificateReady !== undefined
          ? { certificateReady: dto.certificateReady }
          : {}),
        ...(dto.accessNote !== undefined ? { accessNote: dto.accessNote } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.getCourse(id);
  }

  async deleteCourse(id: string) {
    await this.ensureCourse(id);
    await this.prisma.course.delete({ where: { id } });
    return { deleted: true };
  }

  async listSessions(courseId: string) {
    await this.ensureCourse(courseId);
    const sessions = await this.prisma.courseSession.findMany({
      where: { courseId },
      orderBy: { number: 'asc' },
      include: {
            _count: { select: { slides: true, attachments: true } },
          },
    });
    return { sessions: sessions.map((s) => this.mapSession(s)) };
  }

  async createSession(courseId: string, dto: CreateSessionDto) {
    await this.ensureCourse(courseId);
    try {
      const session = await this.prisma.courseSession.create({
        data: {
          courseId,
          number: dto.number,
          title: dto.title ?? '',
          summary:
            dto.summary ??
            'محتوای این جلسه پس از برگزاری کلاس فعال می‌شود.',
          topics: dto.topics ?? [],
          status: dto.status ?? SessionStatus.LOCKED,
          durationLabel: dto.durationLabel ?? '۹۰ دقیقه',
          dateLabel: dto.dateLabel ?? 'قفل',
          timeStart: normalizeClock(dto.timeStart),
          timeEnd: normalizeClock(dto.timeEnd),
        },
        include: {
            _count: { select: { slides: true, attachments: true } },
          },
      });
      await this.syncSessionsTotal(courseId);
      await this.syncScheduleFromSessions(courseId);
      return this.mapSession(session);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('شماره جلسه در این دوره تکراری است.');
      }
      throw error;
    }
  }

  async updateSession(id: string, dto: UpsertSessionDto) {
    const existing = await this.prisma.courseSession.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('جلسه یافت نشد.');

    try {
      const session = await this.prisma.courseSession.update({
        where: { id },
        data: {
          ...(dto.number !== undefined ? { number: dto.number } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
          ...(dto.topics !== undefined ? { topics: dto.topics } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.durationLabel !== undefined
            ? { durationLabel: dto.durationLabel }
            : {}),
          ...(dto.dateLabel !== undefined ? { dateLabel: dto.dateLabel } : {}),
          ...(dto.timeStart !== undefined
            ? { timeStart: normalizeClock(dto.timeStart) }
            : {}),
          ...(dto.timeEnd !== undefined
            ? { timeEnd: normalizeClock(dto.timeEnd) }
            : {}),
        },
        include: {
            _count: { select: { slides: true, attachments: true } },
          },
      });

      await this.syncScheduleFromSessions(existing.courseId);

      return this.mapSession(session);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('شماره جلسه در این دوره تکراری است.');
      }
      throw error;
    }
  }

  async deleteSession(id: string) {
    const existing = await this.prisma.courseSession.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('جلسه یافت نشد.');
    await this.prisma.courseSession.delete({ where: { id } });
    await this.syncSessionsTotal(existing.courseId);
    return { deleted: true };
  }

  async listSlides(sessionId: string) {
    await this.ensureSession(sessionId);
    const slides = await this.prisma.slide.findMany({
      where: { sessionId },
      orderBy: { sortOrder: 'asc' },
    });
    return { slides: slides.map((s) => this.mapSlide(s)) };
  }

  async createSlide(sessionId: string, dto: CreateSlideDto) {
    await this.ensureSession(sessionId);
    const maxOrder = await this.prisma.slide.aggregate({
      where: { sessionId },
      _max: { sortOrder: true },
    });
    const sortOrder = dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1;
    const sourceId =
      dto.sourceId?.trim() || `slide-${Date.now().toString(36)}-${sortOrder}`;

    try {
      const kind = dto.kind ?? SlideKind.LESSON;
      const isVisual = kind === SlideKind.VISUAL;
      const slide = await this.prisma.slide.create({
        data: {
          sessionId,
          sourceId,
          sortOrder,
          chapter: dto.chapter,
          title: dto.title,
          goal: dto.goal ?? '',
          body: dto.body,
          bullets: dto.bullets ?? [],
          terms: (dto.terms ?? []) as unknown as Prisma.InputJsonValue,
          mistakes: dto.mistakes ?? [],
          imageHint: isVisual ? dto.imageHint || null : null,
          imageId: isVisual ? dto.imageId || null : null,
          funFact: dto.funFact,
          kind,
        },
      });
      return this.mapSlide(slide);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('شناسه اسلاید در این جلسه تکراری است.');
      }
      throw error;
    }
  }

  async updateSlide(id: string, dto: UpsertSlideDto) {
    await this.ensureSlide(id);
    const nextKind = dto.kind;
    const clearImage =
      nextKind !== undefined && nextKind !== SlideKind.VISUAL;
    const slide = await this.prisma.slide.update({
      where: { id },
      data: {
        ...(dto.sourceId !== undefined ? { sourceId: dto.sourceId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.chapter !== undefined ? { chapter: dto.chapter } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.goal !== undefined ? { goal: dto.goal } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.bullets !== undefined ? { bullets: dto.bullets } : {}),
        ...(dto.terms !== undefined
          ? { terms: dto.terms as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.mistakes !== undefined ? { mistakes: dto.mistakes } : {}),
        ...(clearImage
          ? { imageHint: null, imageId: null }
          : {
              ...(dto.imageHint !== undefined
                ? { imageHint: dto.imageHint || null }
                : {}),
              ...(dto.imageId !== undefined
                ? { imageId: dto.imageId || null }
                : {}),
            }),
        ...(dto.funFact !== undefined ? { funFact: dto.funFact } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
      },
    });
    return this.mapSlide(slide);
  }

  async deleteSlide(id: string) {
    await this.ensureSlide(id);
    await this.prisma.slide.delete({ where: { id } });
    return { deleted: true };
  }

  async reorderSlides(sessionId: string, dto: ReorderSlidesDto) {
    await this.ensureSession(sessionId);
    await this.prisma.$transaction(
      dto.slideIds.map((slideId, index) =>
        this.prisma.slide.updateMany({
          where: { id: slideId, sessionId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.listSlides(sessionId);
  }

  async listAttachments(sessionId: string) {
    await this.ensureSession(sessionId);
    const attachments = await this.prisma.sessionAttachment.findMany({
      where: { sessionId },
      orderBy: { sortOrder: 'asc' },
    });
    return { attachments: attachments.map((a) => this.mapAttachment(a)) };
  }

  async createAttachment(
    sessionId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    await this.ensureSession(sessionId);
    const maxOrder = await this.prisma.sessionAttachment.aggregate({
      where: { sessionId },
      _max: { sortOrder: true },
    });
    const path = `/uploads/attachments/${file.filename}`;
    try {
      const attachment = await this.prisma.sessionAttachment.create({
        data: {
          sessionId,
          path,
          filename: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          size: file.size,
          caption: caption?.trim() || null,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        },
      });
      return this.mapAttachment(attachment);
    } catch (error) {
      this.unlinkAttachmentFile(path);
      throw error;
    }
  }

  async updateAttachment(id: string, dto: UpdateAttachmentDto) {
    await this.ensureAttachment(id);
    const attachment = await this.prisma.sessionAttachment.update({
      where: { id },
      data: {
        ...(dto.caption !== undefined
          ? { caption: dto.caption.trim() || null }
          : {}),
      },
    });
    return this.mapAttachment(attachment);
  }

  async deleteAttachment(id: string) {
    const existing = await this.ensureAttachment(id);
    await this.prisma.sessionAttachment.delete({ where: { id } });
    this.unlinkAttachmentFile(existing.path);
    return { deleted: true };
  }

  async reorderAttachments(sessionId: string, dto: ReorderAttachmentsDto) {
    await this.ensureSession(sessionId);
    await this.prisma.$transaction(
      dto.attachmentIds.map((attachmentId, index) =>
        this.prisma.sessionAttachment.updateMany({
          where: { id: attachmentId, sessionId },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.listAttachments(sessionId);
  }

  async listSchedule(courseId: string) {
    await this.ensureCourse(courseId);
    const lessons = await this.prisma.scheduleLesson.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
    return { lessons: lessons.map((l) => this.mapLesson(l)) };
  }

  async createSchedule(courseId: string, dto: UpsertScheduleDto) {
    await this.ensureCourse(courseId);
    const maxOrder = await this.prisma.scheduleLesson.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    const lesson = await this.prisma.scheduleLesson.create({
      data: {
        courseId,
        sessionId: dto.sessionId ?? null,
        title: dto.title,
        teacher: dto.teacher,
        day: dto.day,
        dateLabel: dto.dateLabel,
        time: dto.time,
        room: dto.room,
        type: dto.type ?? LessonType.THEORY,
        duration: dto.duration,
        note: dto.note,
        status: dto.status ?? LessonStatus.PLANNED,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return this.mapLesson(lesson);
  }

  async updateSchedule(id: string, dto: UpsertScheduleDto) {
    const existing = await this.prisma.scheduleLesson.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('آیتم برنامه یافت نشد.');
    const lesson = await this.prisma.scheduleLesson.update({
      where: { id },
      data: {
        ...(dto.sessionId !== undefined ? { sessionId: dto.sessionId } : {}),
        title: dto.title,
        teacher: dto.teacher,
        day: dto.day,
        dateLabel: dto.dateLabel,
        time: dto.time,
        room: dto.room,
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        duration: dto.duration,
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.mapLesson(lesson);
  }

  async deleteSchedule(id: string) {
    const existing = await this.prisma.scheduleLesson.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('آیتم برنامه یافت نشد.');
    await this.prisma.scheduleLesson.delete({ where: { id } });
    return { deleted: true };
  }

  async listTips(courseId: string) {
    await this.ensureCourse(courseId);
    const tips = await this.prisma.practiceTip.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      tips: tips.map((t) => ({
        id: t.id,
        text: t.text,
        sortOrder: t.sortOrder,
      })),
    };
  }

  async createTip(courseId: string, dto: UpsertPracticeTipDto) {
    await this.ensureCourse(courseId);
    const maxOrder = await this.prisma.practiceTip.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    const tip = await this.prisma.practiceTip.create({
      data: {
        courseId,
        text: dto.text,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return { id: tip.id, text: tip.text, sortOrder: tip.sortOrder };
  }

  async updateTip(id: string, dto: UpsertPracticeTipDto) {
    const existing = await this.prisma.practiceTip.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('نکته تمرین یافت نشد.');
    const tip = await this.prisma.practiceTip.update({
      where: { id },
      data: {
        text: dto.text,
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return { id: tip.id, text: tip.text, sortOrder: tip.sortOrder };
  }

  async deleteTip(id: string) {
    const existing = await this.prisma.practiceTip.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('نکته تمرین یافت نشد.');
    await this.prisma.practiceTip.delete({ where: { id } });
    return { deleted: true };
  }

  private async syncSessionsTotal(courseId: string) {
    const count = await this.prisma.courseSession.count({ where: { courseId } });
    await this.prisma.course.update({
      where: { id: courseId },
      data: { sessionsTotal: count },
    });
  }

  /**
   * Keep ScheduleLesson statuses in sync with CourseSession unlock state:
   * AVAILABLE → DONE, first after last available → NEXT, rest PLANNED.
   */
  private async syncScheduleFromSessions(courseId: string) {
    const [course, sessions] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.courseSession.findMany({
        where: { courseId },
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
    ]);
    if (!course || sessions.length === 0) return;

    let lastAvailableNumber = 0;
    for (const session of sessions) {
      if (session.status === SessionStatus.AVAILABLE) {
        lastAvailableNumber = Math.max(lastAvailableNumber, session.number);
      }
    }

    const lessons = await this.prisma.scheduleLesson.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });

    for (let i = 0; i < lessons.length; i += 1) {
      const lesson = lessons[i];
      const linked = lesson.sessionId
        ? sessions.find((s) => s.id === lesson.sessionId)
        : sessions[i];
      const number = linked?.number ?? i + 1;

      let status: LessonStatus = LessonStatus.PLANNED;
      if (number <= lastAvailableNumber) {
        status = LessonStatus.DONE;
      } else if (number === lastAvailableNumber + 1) {
        status = LessonStatus.NEXT;
      }

      const time = formatTimeRange(
        linked?.timeStart,
        linked?.timeEnd,
        course.time,
      );
      const dateLabel =
        linked?.dateLabel &&
        linked.dateLabel !== 'قفل' &&
        linked.dateLabel !== '—'
          ? linked.dateLabel
          : lesson.dateLabel;

      await this.prisma.scheduleLesson.update({
        where: { id: lesson.id },
        data: {
          status,
          time,
          dateLabel,
        },
      });
    }
  }

  private async ensureCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('دوره یافت نشد.');
    return course;
  }

  private async ensureSession(id: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('جلسه یافت نشد.');
    return session;
  }

  private async ensureSlide(id: string) {
    const slide = await this.prisma.slide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException('اسلاید یافت نشد.');
    return slide;
  }

  private async ensureAttachment(id: string) {
    const attachment = await this.prisma.sessionAttachment.findUnique({
      where: { id },
    });
    if (!attachment) throw new NotFoundException('فایل پیوست یافت نشد.');
    return attachment;
  }

  private unlinkAttachmentFile(path: string) {
    if (!path.startsWith('/uploads/attachments/')) return;
    const abs = join(process.cwd(), path.replace(/^\//, ''));
    if (!existsSync(abs)) return;
    try {
      unlinkSync(abs);
    } catch {
      /* ignore missing files */
    }
  }

  private mapCourse(
    course: Prisma.CourseGetPayload<{
      include: {
        _count: {
          select: { sessions: true; enrollments: true; lessons: true };
        };
      };
    }>,
  ) {
    return {
      id: course.id,
      slug: course.slug,
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
      weeklyHours: course.weeklyHours,
      status: course.status,
      certificateReady: course.certificateReady,
      accessNote: course.accessNote,
      isActive: course.isActive,
      sortOrder: course.sortOrder,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      sessionsCount: course._count.sessions,
      enrollmentsCount: course._count.enrollments,
      scheduleCount: course._count.lessons,
    };
  }

  private mapSession(
    session: Prisma.CourseSessionGetPayload<{
      include: {
        _count: { select: { slides: true; attachments: true } };
      };
    }>,
  ) {
    return {
      id: session.id,
      courseId: session.courseId,
      number: session.number,
      title: session.title,
      summary: session.summary,
      topics: session.topics,
      status: session.status,
      durationLabel: session.durationLabel,
      dateLabel: session.dateLabel,
      timeStart: session.timeStart,
      timeEnd: session.timeEnd,
      timeLabel: formatTimeRange(session.timeStart, session.timeEnd),
      slideCount: session._count.slides,
      attachmentCount: session._count.attachments,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private mapAttachment(attachment: {
    id: string;
    sessionId: string;
    path: string;
    filename: string;
    mimeType: string;
    size: number;
    caption: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: attachment.id,
      sessionId: attachment.sessionId,
      path: attachment.path,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      caption: attachment.caption,
      sortOrder: attachment.sortOrder,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
    };
  }

  private mapSlide(slide: {
    id: string;
    sessionId: string;
    sourceId: string;
    sortOrder: number;
    chapter: string;
    title: string;
    goal: string;
    body: string;
    bullets: string[];
    terms: Prisma.JsonValue;
    mistakes: string[];
    imageHint: string | null;
    imageId: string | null;
    funFact: string | null;
    kind: SlideKind;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: slide.id,
      sessionId: slide.sessionId,
      sourceId: slide.sourceId,
      sortOrder: slide.sortOrder,
      chapter: slide.chapter,
      title: slide.title,
      goal: slide.goal,
      body: slide.body,
      bullets: slide.bullets,
      terms: slide.terms,
      mistakes: slide.mistakes,
      imageHint: slide.imageHint,
      imageId: slide.imageId,
      funFact: slide.funFact,
      kind: slide.kind,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    };
  }

  private mapLesson(lesson: {
    id: string;
    courseId: string;
    sessionId: string | null;
    title: string;
    teacher: string;
    day: string;
    dateLabel: string;
    time: string;
    room: string;
    type: LessonType;
    duration: string;
    note: string | null;
    status: LessonStatus;
    sortOrder: number;
  }) {
    return {
      id: lesson.id,
      courseId: lesson.courseId,
      sessionId: lesson.sessionId,
      title: lesson.title,
      teacher: lesson.teacher,
      day: lesson.day,
      dateLabel: lesson.dateLabel,
      time: lesson.time,
      room: lesson.room,
      type: lesson.type,
      duration: lesson.duration,
      note: lesson.note,
      status: lesson.status,
      sortOrder: lesson.sortOrder,
    };
  }
}
