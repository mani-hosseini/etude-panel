import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStudentLevel } from '../common/utils/mappers';
import { courseIdentityWhere } from '../common/utils/slug';
import {
  WEEKDAYS,
  assignedDays,
  daysOverlap,
  joinDays,
  normalizeDays,
} from '../common/utils/weekdays';
import { isPieceCategory } from './assignment-categories';
import {
  classWasHeld,
  studentFacingSessionStatus,
} from '../common/utils/session-unlock';
import {
  CreateAssignmentDto,
  CreatePracticeLogDto,
  MarkTodayAttendanceDto,
  SaveScoresDto,
  SaveSessionWorkDto,
  UpdateAssignmentProgressDto,
  UpdateStudentLevelDto,
  UpdateStudentStarsDto,
  UpdateTeacherProfileDto,
  UpsertAttendanceDto,
} from './dto/studio.dto';

const JS_DAY_TO_WEEKDAY = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
] as const;

type TrackKey = 'technique' | 'theory' | 'solfege' | 'piece';

const TRACK_KEYS: TrackKey[] = ['technique', 'theory', 'solfege', 'piece'];

const TRACK_LABELS: Record<TrackKey, string> = {
  technique: 'تکنیک',
  theory: 'تئوری موسیقی',
  solfege: 'سلفژ',
  piece: 'قطعه',
};

const TRACK_CATEGORIES: Record<string, TrackKey> = {
    تکنیک: 'technique',
    هانون: 'technique',
    گام: 'technique',
    تئوری: 'theory',
    'تئوری موسیقی': 'theory',
    سلفژ: 'solfege',
    قطعه: 'piece',
  };

@Injectable()
export class StudioService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(teacherId: string) {
    const [profile, classes, students, assignments, attendanceAvg] =
      await Promise.all([
        this.profile(teacherId),
        this.listClasses(teacherId),
        this.listStudents(teacherId),
        this.listAssignments(teacherId),
        this.averageAttendance(teacherId),
      ]);
    const classSlots = this.expandClasses(classes);

    return {
      profile,
      stats: {
        students: students.length,
        classes: classSlots.length,
        activeAssignments: assignments.filter((item) => item.progress < 100)
          .length,
        avgAttendance: attendanceAvg,
      },
      nextClass: this.nextClass(classSlots),
      recentAssignments: assignments.slice(0, 4),
      students: students.slice(0, 8),
      classes,
    };
  }

  async profile(teacherId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });
    if (!user || user.role !== Role.TEACHER) {
      throw new NotFoundException('استاد یافت نشد.');
    }
    const studentCount = await this.prisma.enrollment.count({
      where: { course: { teacherId } },
    });
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      title: user.title ?? 'استاد',
      instrument: user.instrument,
      room: user.room,
      bio: user.bio,
      phone: user.phone,
      since: user.createdAt.toISOString(),
      studentCount,
    };
  }

  async updateProfile(teacherId: string, dto: UpdateTeacherProfileDto) {
    await this.requireTeacher(teacherId);
    await this.prisma.user.update({
      where: { id: teacherId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
        ...(dto.instrument !== undefined
          ? { instrument: dto.instrument.trim() || null }
          : {}),
        ...(dto.room !== undefined ? { room: dto.room.trim() || null } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      },
    });
    return this.profile(teacherId);
  }

  async listClasses(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      where: { teacherId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { enrollments: true } } },
    });
    return courses.map((course) => this.mapClass(course));
  }

  async listStudents(teacherId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course: { teacherId }, user: { role: Role.STUDENT } },
      include: {
        user: true,
        course: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    const unique = new Map<string, (typeof enrollments)[number]>();
    for (const row of enrollments) {
      if (!unique.has(row.userId)) unique.set(row.userId, row);
    }

    const students = [...unique.values()];
    const ids = students.map((item) => item.userId);
    const [rates, pieces, stars] = await Promise.all([
      this.attendanceRates(teacherId, ids),
      this.latestPieces(teacherId, ids),
      this.starRatings(teacherId, ids),
    ]);

    return students.map((row) =>
      this.mapStudent(
        row.user,
        row.course,
        rates,
        pieces,
        stars,
        row.classDays,
      ),
    );
  }

  async getStudent(teacherId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        course: { teacherId },
        user: { role: Role.STUDENT },
      },
      include: { user: true, course: true },
    });
    if (!enrollment) {
      throw new NotFoundException('این هنرجو در کلاس‌های شما نیست.');
    }
    const [rates, pieces, stars, assignments, sessions] = await Promise.all([
      this.attendanceRates(teacherId, [studentId]),
      this.latestPieces(teacherId, [studentId]),
      this.starRatings(teacherId, [studentId]),
      this.listAssignments(teacherId, studentId),
      this.studentSessions(teacherId, studentId),
    ]);
    return {
      ...this.mapStudent(
        enrollment.user,
        enrollment.course,
        rates,
        pieces,
        stars,
        enrollment.classDays,
      ),
      assignments,
      sessions,
    };
  }

  async updateStars(
    teacherId: string,
    studentId: string,
    dto: UpdateStudentStarsDto,
  ) {
    await this.requireStudentOfTeacher(teacherId, studentId);
    const row = await this.prisma.studentStarRating.upsert({
      where: { teacherId_studentId: { teacherId, studentId } },
      create: { teacherId, studentId, stars: dto.stars },
      update: { stars: dto.stars },
    });
    return { studentId, stars: row.stars };
  }

  async updateLevel(
    teacherId: string,
    studentId: string,
    dto: UpdateStudentLevelDto,
  ) {
    await this.requireStudentOfTeacher(teacherId, studentId);
    const level = normalizeStudentLevel(String(dto.level));
    await this.prisma.user.update({
      where: { id: studentId },
      data: { level },
    });
    return { studentId, level: Number(level) };
  }

  async schedule(teacherId: string) {
    const classes = await this.listClasses(teacherId);
    const students = await this.listStudents(teacherId);
    const lessons = await this.prisma.scheduleLesson.findMany({
      where: { course: { teacherId } },
      include: { course: true },
      orderBy: { sortOrder: 'asc' },
    });

    const byDay = WEEKDAYS.map((day) => {
      const fromLessons = lessons
        .filter((item) => item.day === day)
        .map((item) => ({
          id: item.id,
          courseId: item.course.slug,
          title: item.title,
          start: this.splitTime(item.time).start,
          end: this.splitTime(item.time).end,
          room: item.room,
          focus: item.note || item.course.focus,
          studentIds: students
            .filter(
              (student) =>
                student.classId === item.course.slug &&
                daysOverlap(student.classDays, day, item.course.days),
            )
            .map((student) => student.id),
        }));
      if (fromLessons.length > 0) {
        return { day, slots: fromLessons };
      }
      return {
        day,
        slots: classes.flatMap((item) =>
          (item.days.length > 0 ? item.days : [item.day])
            .filter((classDay) => classDay === day)
            .map((classDay) => ({
              id: `${item.id}:${classDay}`,
              courseId: item.id,
              title: item.title,
              start: item.start,
              end: item.end,
              room: item.room,
              focus: item.focus,
              studentIds: students
                .filter(
                  (student) =>
                    student.classId === item.id &&
                    daysOverlap(student.classDays, classDay, item.days),
                )
                .map((student) => student.id),
            })),
        ),
      };
    });

    return { today: this.weekdayToday(), days: byDay, students, classes };
  }

  async todayRoster(teacherId: string) {
    const schedule = await this.schedule(teacherId);
    const todaySlots = schedule.days.find((item) => item.day === schedule.today)
      ?.slots ?? [];
    const studentIds = [
      ...new Set(todaySlots.flatMap((slot) => slot.studentIds)),
    ];
    const studentsById = new Map(
      schedule.students.map((item) => [item.id, item]),
    );

    if (studentIds.length === 0) {
      return {
        today: schedule.today,
        classes: [],
        nextClass: this.nextClass(this.expandClasses(schedule.classes)),
      };
    }

    const [sessions, marks, homeworkRows] = await Promise.all([
      this.prisma.courseSession.findMany({
        where: { course: { teacherId } },
        include: { course: { select: { id: true, slug: true } } },
        orderBy: { number: 'asc' },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds }, course: { teacherId } },
      }),
      this.prisma.practiceAssignmentTarget.findMany({
        where: {
          studentId: { in: studentIds },
          assignment: { teacherId, sessionId: { not: null } },
        },
        select: {
          studentId: true,
          score: true,
          assignment: {
            select: {
              category: true,
              title: true,
              session: {
                select: {
                  id: true,
                  number: true,
                  courseId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const sessionsBySlug = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const slug = session.course.slug;
      const list = sessionsBySlug.get(slug) ?? [];
      list.push(session);
      sessionsBySlug.set(slug, list);
    }

    const markByKey = new Map(
      marks.map((item) => [
        `${item.studentId}:${item.meetingKey}`,
        item,
      ]),
    );

    const cursorByStudentCourse = new Map<string, number>();
    for (const row of homeworkRows) {
      const session = row.assignment.session;
      if (!session) continue;
      const key = `${row.studentId}:${session.courseId}`;
      cursorByStudentCourse.set(
        key,
        Math.max(cursorByStudentCourse.get(key) ?? 0, session.number),
      );
    }

    const classes = todaySlots.map((slot) => {
      const courseSessions = sessionsBySlug.get(slot.courseId) ?? [];
      const roster = slot.studentIds
        .map((id) => studentsById.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((student) => {
          const work = this.pickWorkSession(
            student.id,
            courseSessions,
            markByKey,
            cursorByStudentCourse,
          );
          const attendance = work
            ? markByKey.get(`${student.id}:${work.id}`)?.status.toLowerCase() ??
              null
            : null;
          const next = work
            ? courseSessions.find((item) => item.number === work.number + 1)
            : null;
          const nextHomework = homeworkRows
            .filter(
              (row) =>
                row.studentId === student.id &&
                row.assignment.session?.id === next?.id,
            )
            .map((row) => ({
              category: row.assignment.category,
              title: row.assignment.title,
            }));
          return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            displayName: student.displayName,
            level: student.level,
            piece: student.piece,
            stars: student.stars,
            avatarUrl: student.avatarUrl ?? null,
            sessionId: work?.id ?? null,
            sessionNumber: work?.number ?? null,
            sessionTitle: work?.title ?? '',
            attendance,
            nextSessionNumber: next?.number ?? null,
            nextHomework,
          };
        });
      const marked = roster.filter((item) => item.attendance).length;
      const held = roster.filter(
        (item) => item.attendance && item.attendance !== 'absent',
      ).length;
      return {
        id: slot.id,
        courseId: slot.courseId,
        title: slot.title,
        start: slot.start,
        end: slot.end,
        room: slot.room,
        focus: slot.focus,
        held,
        marked,
        students: roster,
      };
    });

    return {
      today: schedule.today,
      classes,
      nextClass: this.nextClass(this.expandClasses(schedule.classes)),
    };
  }

  async markTodayAttendance(teacherId: string, dto: MarkTodayAttendanceDto) {
    for (const mark of dto.marks) {
      await this.saveSessionWork(teacherId, mark.sessionId, {
        studentId: mark.studentId,
        attendance: mark.status,
      });
    }
    return this.todayRoster(teacherId);
  }

  async listAssignments(teacherId: string, studentId?: string) {
    const rows = await this.prisma.practiceAssignment.findMany({
      where: {
        teacherId,
        ...(studentId ? { targets: { some: { studentId } } } : {}),
      },
      include: {
        course: { select: { slug: true, title: true } },
        session: { select: { id: true, number: true, title: true } },
        targets: {
          where: studentId ? { studentId } : undefined,
          include: { student: { select: { displayName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapAssignment(row));
  }

  async createAssignment(teacherId: string, dto: CreateAssignmentDto) {
    const classSession = dto.sessionId
      ? await this.prisma.courseSession.findFirst({
          where: { id: dto.sessionId, course: { teacherId } },
          include: { course: true },
        })
      : null;
    if (dto.sessionId && !classSession) {
      throw new NotFoundException('این جلسه برای شما ثبت نشده است.');
    }

    let homeworkSession = classSession;
    if (dto.forNextSession && classSession) {
      const next = await this.prisma.courseSession.findFirst({
        where: {
          courseId: classSession.courseId,
          number: classSession.number + 1,
        },
        include: { course: true },
      });
      if (next) homeworkSession = next;
    }

    const course = homeworkSession
      ? homeworkSession.course
      : dto.courseId
        ? await this.requireTaughtCourse(teacherId, dto.courseId)
        : null;
    let studentIds = await this.resolveTargets(
      teacherId,
      course?.id ?? null,
      dto.studentIds,
    );
    if (classSession && studentIds.length > 0) {
      const absent = await this.prisma.attendanceRecord.findMany({
        where: {
          meetingKey: classSession.id,
          studentId: { in: studentIds },
          status: AttendanceStatus.ABSENT,
        },
        select: { studentId: true },
      });
      const absentIds = new Set(absent.map((row) => row.studentId));
      studentIds = studentIds.filter((id) => !absentIds.has(id));
    }
    if (studentIds.length === 0) {
      throw new ForbiddenException(
        classSession
          ? 'این هنرجو برای این جلسه غایب است و تکلیف داده نمی‌شود.'
          : 'هنرجویی برای این تمرین پیدا نشد.',
      );
    }

    const created = await this.prisma.practiceAssignment.create({
      data: {
        teacherId,
        courseId: course?.id ?? null,
        sessionId: homeworkSession?.id ?? null,
        category: dto.category.trim(),
        title: dto.title.trim(),
        source: isPieceCategory(dto.category)
          ? ''
          : dto.source?.trim() ?? '',
        note: dto.note?.trim() ?? '',
        dueLabel:
          dto.dueLabel?.trim() ||
          (homeworkSession ? `جلسه ${homeworkSession.number}` : 'کلاس بعد'),
        targets: {
          create: studentIds.map((studentId) => ({
            studentId,
            score: 0,
            progress: 0,
          })),
        },
      },
      include: {
        course: { select: { slug: true, title: true } },
        session: { select: { id: true, number: true, title: true } },
        targets: { include: { student: { select: { displayName: true } } } },
      },
    });
    if (homeworkSession) {
      await this.openSessionForStudents(homeworkSession, studentIds, true);
      if (homeworkSession.id === classSession?.id) {
        await this.markPresentIfUnmarked(homeworkSession, studentIds, teacherId);
      }
    }
    return this.mapAssignment(created);
  }

  async deleteAssignment(teacherId: string, id: string) {
    const existing = await this.prisma.practiceAssignment.findFirst({
      where: { id, teacherId },
      include: { targets: { select: { studentId: true } } },
    });
    if (!existing) throw new NotFoundException('تمرین یافت نشد.');
    const studentIds = existing.targets.map((item) => item.studentId);
    const courseId = existing.courseId;
    await this.prisma.practiceAssignment.delete({ where: { id } });
    if (courseId) {
      await Promise.all(
        studentIds.map((studentId) =>
          this.syncEnrollmentCursor(studentId, courseId),
        ),
      );
    }
    return { deleted: true };
  }

  async meetings(teacherId: string) {
    const classes = await this.listClasses(teacherId);
    const students = await this.listStudents(teacherId);
    const [sessions, marks] = await Promise.all([
      this.prisma.courseSession.findMany({
        where: { course: { teacherId } },
        include: {
          course: {
            select: {
              slug: true,
              title: true,
              day: true,
              timeShort: true,
              room: true,
            },
          },
        },
        orderBy: [{ course: { sortOrder: 'asc' } }, { number: 'asc' }],
      }),
      this.prisma.attendanceRecord.findMany({
        where: { course: { teacherId } },
      }),
    ]);
    const meetings = sessions.map((session) => {
      const time = this.splitTime(session.course.timeShort);
      return {
        id: session.id,
        courseId: session.course.slug,
        sessionNumber: session.number,
        label: `جلسه ${session.number} · ${session.course.title}`,
        day: session.course.day,
        title: session.title || session.course.title,
        start: time.start,
        end: time.end,
        room: session.course.room,
        status: session.status.toLowerCase(),
        homeworkTitle: session.homeworkTitle,
        homeworkSource: session.homeworkSource,
        homeworkNote: session.homeworkNote,
      };
    });
    return {
      meetings,
      students,
      attendance: marks.map((item) => ({
        courseId: classes.find((cls) => cls.uuid === item.courseId)?.id,
        meetingKey: item.meetingKey,
        studentId: item.studentId,
        status: item.status.toLowerCase(),
      })),
    };
  }

  async saveSessionWork(
    teacherId: string,
    sessionId: string,
    dto: SaveSessionWorkDto,
  ) {
    const session = await this.prisma.courseSession.findFirst({
      where: { id: sessionId, course: { teacherId } },
      include: { course: true },
    });
    if (!session) throw new NotFoundException('این جلسه برای شما ثبت نشده است.');

    const studentIds = dto.studentId
      ? [
          (
            await this.requireStudentOfTeacher(
              teacherId,
              dto.studentId,
              session.courseId,
            )
          ).userId,
        ]
      : await this.resolveTargets(teacherId, session.courseId);

    if (dto.attendance) {
      if (!dto.studentId) {
        throw new ForbiddenException(
          'برای ثبت حضور باید هنرجو مشخص باشد.',
        );
      }
      await this.prisma.attendanceRecord.upsert({
        where: {
          courseId_studentId_meetingKey: {
            courseId: session.courseId,
            studentId: dto.studentId,
            meetingKey: session.id,
          },
        },
        create: {
          courseId: session.courseId,
          studentId: dto.studentId,
          meetingKey: session.id,
          status: dto.attendance,
          markedById: teacherId,
        },
        update: { status: dto.attendance, markedById: teacherId },
      });
      if (dto.attendance === AttendanceStatus.ABSENT) {
        await this.removeSessionAssignment(
          teacherId,
          session.id,
          dto.studentId,
        );
        await this.syncEnrollmentCursor(dto.studentId, session.courseId);
      } else if (classWasHeld(dto.attendance)) {
        await this.prisma.enrollment.updateMany({
          where: {
            courseId: session.courseId,
            userId: dto.studentId,
            currentSessionNumber: { lt: session.number },
          },
          data: { currentSessionNumber: session.number },
        });
      }
    }

    const marks = await this.prisma.attendanceRecord.findMany({
      where: { meetingKey: session.id, studentId: { in: studentIds } },
    });
    const statusByStudent = new Map(
      marks.map((item) => [item.studentId, item.status]),
    );

    const nextTitle =
      dto.homeworkTitle !== undefined
        ? dto.homeworkTitle.trim()
        : session.homeworkTitle;
    const nextSource =
      dto.homeworkSource !== undefined
        ? dto.homeworkSource.trim()
        : session.homeworkSource;
    const nextNote =
      dto.homeworkNote !== undefined
        ? dto.homeworkNote.trim()
        : session.homeworkNote;
    const unlock = nextTitle.length > 0 || nextNote.length > 0;
    const homeworkTouched =
      dto.homeworkTitle !== undefined ||
      dto.homeworkSource !== undefined ||
      dto.homeworkNote !== undefined;

    if (homeworkTouched) {
      await this.prisma.courseSession.update({
        where: { id: session.id },
        data: {
          homeworkTitle: nextTitle,
          homeworkSource: nextSource,
          homeworkNote: nextNote,
        },
      });
    }

    const presentIds = studentIds.filter(
      (id) => statusByStudent.get(id) !== AttendanceStatus.ABSENT,
    );
    if (unlock) {
      await this.openSessionForStudents(session, presentIds, true);
    }

    if (homeworkTouched && nextTitle.length > 0) {
      for (const studentId of presentIds) {
        await this.upsertSessionAssignment(teacherId, {
          sessionId: session.id,
          courseId: session.courseId,
          studentId,
          title: nextTitle,
          source: nextSource,
          note: nextNote,
        });
      }
    }

    const updated = await this.prisma.courseSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    const attendance = dto.studentId
      ? await this.prisma.attendanceRecord.findUnique({
          where: {
            courseId_studentId_meetingKey: {
              courseId: session.courseId,
              studentId: dto.studentId,
              meetingKey: session.id,
            },
          },
        })
      : null;

    const studentStatus = studentFacingSessionStatus(attendance?.status);
    return {
      sessionId: updated.id,
      courseId: session.course.slug,
      number: updated.number,
      status: studentStatus,
      homeworkTitle: updated.homeworkTitle,
      homeworkSource: updated.homeworkSource,
      homeworkNote: updated.homeworkNote,
      unlocked: studentStatus === 'available',
      attendance: attendance?.status.toLowerCase() ?? null,
    };
  }

  async confirmSession(
    teacherId: string,
    studentId: string,
    sessionId: string,
  ) {
    const session = await this.prisma.courseSession.findFirst({
      where: { id: sessionId, course: { teacherId } },
      include: { course: true },
    });
    if (!session) throw new NotFoundException('این جلسه برای شما ثبت نشده است.');
    await this.requireStudentOfTeacher(teacherId, studentId, session.courseId);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId: session.courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('این هنرجو در این کلاس نیست.');
    }
    const lastNumber = await this.prisma.courseSession.aggregate({
      where: { courseId: session.courseId },
      _max: { number: true },
    });
    const maxNumber = lastNumber._max.number ?? session.number;
    const nextNumber = Math.min(session.number + 1, maxNumber);
    const isLast = nextNumber === session.number;

    const homeworkCursor = await this.lastHomeworkNumber(
      studentId,
      session.courseId,
    );
    const currentSessionNumber = homeworkCursor;
    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        currentSessionNumber: Math.max(homeworkCursor, 1),
      },
    });

    const next = isLast
      ? session
      : await this.prisma.courseSession.findFirst({
          where: { courseId: session.courseId, number: nextNumber },
        });

    return {
      studentId,
      confirmedSessionId: session.id,
      confirmedNumber: session.number,
      currentSessionNumber,
      isLast,
      nextSession: next
        ? {
            id: next.id,
            number: next.number,
            title: next.title,
            courseId: session.course.slug,
          }
        : null,
    };
  }

  async upsertAttendance(teacherId: string, dto: UpsertAttendanceDto) {
    const course = await this.requireTaughtCourse(teacherId, dto.courseId);
    await this.requireStudentOfTeacher(teacherId, dto.studentId, course.id);
    const row = await this.prisma.attendanceRecord.upsert({
      where: {
        courseId_studentId_meetingKey: {
          courseId: course.id,
          studentId: dto.studentId,
          meetingKey: dto.meetingKey,
        },
      },
      create: {
        courseId: course.id,
        studentId: dto.studentId,
        meetingKey: dto.meetingKey,
        status: dto.status,
        markedById: teacherId,
      },
      update: { status: dto.status, markedById: teacherId },
    });
    return {
      courseId: course.slug,
      meetingKey: row.meetingKey,
      studentId: row.studentId,
      status: row.status.toLowerCase(),
    };
  }

  async studentAssignments(studentId: string) {
    const rows = await this.prisma.practiceAssignmentTarget.findMany({
      where: { studentId },
      include: {
        assignment: {
          include: {
            course: { select: { slug: true, title: true } },
            teacher: { select: { displayName: true } },
            session: { select: { id: true, number: true } },
          },
        },
      },
      orderBy: { assignment: { createdAt: 'desc' } },
    });
    const sessionIds = rows
      .map((row) => row.assignment.sessionId)
      .filter((id): id is string => Boolean(id));
    const absentKeys = new Set<string>();
    if (sessionIds.length > 0) {
      const marks = await this.prisma.attendanceRecord.findMany({
        where: {
          studentId,
          meetingKey: { in: sessionIds },
          status: AttendanceStatus.ABSENT,
        },
        select: { meetingKey: true },
      });
      for (const mark of marks) absentKeys.add(mark.meetingKey);
    }

    return rows
      .filter(
        (row) =>
          !row.assignment.sessionId ||
          !absentKeys.has(row.assignment.sessionId),
      )
      .map((row) => ({
        id: row.id,
        assignmentId: row.assignmentId,
        category: row.assignment.category,
        title: row.assignment.title,
        source: row.assignment.source,
        note: row.assignment.note,
        dueLabel: row.assignment.dueLabel,
        progress: row.progress,
        score: row.score,
        short: row.assignment.title.slice(0, 18),
        teacher: row.assignment.teacher.displayName,
        courseTitle: row.assignment.course?.title ?? null,
        sessionId: row.assignment.sessionId,
        sessionNumber: row.assignment.session?.number ?? null,
      }));
  }

  async updateTargetProgress(
    userId: string,
    targetId: string,
    dto: UpdateAssignmentProgressDto,
    asTeacher: boolean,
  ) {
    const target = await this.prisma.practiceAssignmentTarget.findUnique({
      where: { id: targetId },
      include: { assignment: true },
    });
    if (!target) throw new NotFoundException('تمرین یافت نشد.');
    const allowed = asTeacher
      ? target.assignment.teacherId === userId
      : target.studentId === userId;
    if (!allowed) throw new ForbiddenException('اجازه ویرایش این تمرین را ندارید.');
    if (!asTeacher && dto.score != null) {
      throw new ForbiddenException('فقط استاد می‌تواند نمره اجرا را ثبت کند.');
    }
    const updated = await this.prisma.practiceAssignmentTarget.update({
      where: { id: targetId },
      data: {
        ...(dto.progress != null ? { progress: dto.progress } : {}),
        ...(dto.score != null ? { score: dto.score, progress: dto.score } : {}),
      },
    });
    return {
      id: updated.id,
      progress: updated.progress,
      score: updated.score,
    };
  }

  async saveScores(teacherId: string, dto: SaveScoresDto) {
    const ids = dto.scores.map((item) => item.targetId);
    const targets = await this.prisma.practiceAssignmentTarget.findMany({
      where: { id: { in: ids } },
      include: { assignment: { select: { teacherId: true } } },
    });
    if (targets.length !== ids.length) {
      throw new NotFoundException('یکی از تمرین‌ها یافت نشد.');
    }
    if (targets.some((item) => item.assignment.teacherId !== teacherId)) {
      throw new ForbiddenException('اجازه ثبت این نمره‌ها را ندارید.');
    }
    const scoreById = new Map(
      dto.scores.map((item) => [item.targetId, item.score]),
    );
    await this.prisma.$transaction(
      targets.map((target) => {
        const score = scoreById.get(target.id) ?? 0;
        return this.prisma.practiceAssignmentTarget.update({
          where: { id: target.id },
          data: { score, progress: score },
        });
      }),
    );
    return {
      saved: targets.length,
      scores: dto.scores,
    };
  }

  async practiceSeries(studentId: string, range: '7d' | '30d' | '90d' = '7d') {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: studentId },
      include: { course: true },
      orderBy: { joinedAt: 'asc' },
    });
    const plannedPerDay = Math.max(
      20,
      Math.round(((enrollment?.course.weeklyHours ?? 2) * 60) / 7),
    );
    const today = this.startOfDay(new Date());
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 84;
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const logs = await this.prisma.practiceLog.findMany({
      where: { userId: studentId, date: { gte: from, lte: today } },
    });
    const byDay = new Map(
      logs.map((row) => [row.date.toISOString().slice(0, 10), row.minutes]),
    );

    if (range === '90d') {
      const points = [];
      for (let w = 0; w < 12; w += 1) {
        let planned = 0;
        let done = 0;
        for (let d = 0; d < 7; d += 1) {
          const date = new Date(from);
          date.setUTCDate(from.getUTCDate() + w * 7 + d);
          const key = date.toISOString().slice(0, 10);
          planned += plannedPerDay;
          done += byDay.get(key) ?? 0;
        }
        points.push({
          label: `هفته ${w + 1}`,
          planned,
          done,
        });
      }
      return { range, points, todayMinutes: byDay.get(today.toISOString().slice(0, 10)) ?? 0 };
    }

    const points = Array.from({ length: days }, (_, i) => {
      const date = new Date(from);
      date.setUTCDate(from.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      return {
        label:
          range === '7d'
            ? JS_DAY_TO_WEEKDAY[date.getDay()] ?? key
            : String(i + 1),
        planned: plannedPerDay,
        done: byDay.get(key) ?? 0,
      };
    });
    return {
      range,
      points,
      todayMinutes: byDay.get(today.toISOString().slice(0, 10)) ?? 0,
    };
  }

  async logPractice(studentId: string, dto: CreatePracticeLogDto) {
    const date = dto.date
      ? this.startOfDay(new Date(dto.date))
      : this.startOfDay(new Date());
    if (Number.isNaN(date.getTime())) {
      throw new ForbiddenException('تاریخ نامعتبر است.');
    }
    const row = await this.prisma.practiceLog.upsert({
      where: { userId_date: { userId: studentId, date } },
      create: { userId: studentId, date, minutes: dto.minutes },
      update: { minutes: dto.minutes },
    });
    return {
      date: row.date.toISOString().slice(0, 10),
      minutes: row.minutes,
    };
  }

  async pathProgress(studentId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!user) throw new NotFoundException('هنرجو یافت نشد.');
    const currentLevel = Number(normalizeStudentLevel(user.level));
    const [assignments, series, stars] = await Promise.all([
      this.studentAssignments(studentId),
      this.practiceSeries(studentId, '7d'),
      this.studentStars(studentId),
    ]);
    const sessionBuckets: Record<TrackKey, Map<number, number[]>> = {
      technique: new Map(),
      theory: new Map(),
      solfege: new Map(),
      piece: new Map(),
    };
    let orphan = 0;
    for (const item of assignments) {
      if (!(item.score > 0)) continue;
      const key = TRACK_CATEGORIES[item.category] ?? 'technique';
      const sessionNumber =
        item.sessionNumber && item.sessionNumber > 0
          ? item.sessionNumber
          : -(++orphan);
      const list = sessionBuckets[key].get(sessionNumber) ?? [];
      list.push(item.score);
      sessionBuckets[key].set(sessionNumber, list);
    }
    const avg = (values: number[]) =>
      values.length === 0
        ? 0
        : Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
    const trackStats = TRACK_KEYS.map((key) => {
      const sessions = [...sessionBuckets[key].entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([sessionNumber, scores]) => ({
          sessionNumber: sessionNumber > 0 ? sessionNumber : null,
          score: avg(scores),
        }));
      return {
        key,
        label: TRACK_LABELS[key],
        average: avg(sessions.map((item) => item.score)),
        count: sessions.length,
        sessions,
      };
    });
    const tracks = {
      technique: trackStats[0]!.average,
      theory: trackStats[1]!.average,
      solfege: trackStats[2]!.average,
      piece: trackStats[3]!.average,
    };
    const scoredAverages = trackStats
      .filter((item) => item.count > 0)
      .map((item) => item.average);
    const currentAvg = avg(scoredAverages);
    const open = assignments.filter((item) => item.progress < 100);
    const focus =
      [...open].sort((a, b) => a.progress - b.progress)[0] ?? null;
    let streak = 0;
    for (let i = series.points.length - 1; i >= 0; i -= 1) {
      const point = series.points[i];
      if ((point?.done ?? 0) > 0) {
        streak += 1;
        continue;
      }
      if (i === series.points.length - 1) continue;
      break;
    }
    const fullTracks = {
      technique: 100,
      theory: 100,
      solfege: 100,
      piece: 100,
    };
    const emptyTracks = {
      technique: 0,
      theory: 0,
      solfege: 0,
      piece: 0,
    };
    const levels = Array.from({ length: 10 }, (_, index) => {
      const level = index + 1;
      if (level < currentLevel) {
        return {
          level,
          progress: 100,
          state: 'done' as const,
          tracks: fullTracks,
        };
      }
      if (level > currentLevel) {
        return {
          level,
          progress: 0,
          state: 'locked' as const,
          tracks: emptyTracks,
        };
      }
      return {
        level,
        progress: currentAvg,
        state: 'current' as const,
        tracks,
      };
    });
    return {
      currentLevel,
      tracks,
      overallPercent: Math.round(
        ((currentLevel - 1 + currentAvg / 100) / 10) * 100,
      ),
      stars,
      todayMinutes: series.todayMinutes,
      week: series.points,
      streak,
      assignments,
      focus,
      levels,
      trackStats,
    };
  }

  private mapClass(course: {
    id: string;
    slug: string;
    title: string;
    day: string;
    days?: string[];
    timeShort: string;
    room: string;
    focus: string;
    _count?: { enrollments: number };
  }) {
    const time = this.splitTime(course.timeShort);
    const days = normalizeDays(course.days, course.day);
    return {
      id: course.slug,
      uuid: course.id,
      title: course.title,
      day: joinDays(days, course.day),
      days,
      start: time.start,
      end: time.end,
      room: course.room,
      focus: course.focus,
      studentCount: course._count?.enrollments ?? 0,
    };
  }

  private mapStudent(
    user: {
      id: string;
      firstName: string;
      lastName: string;
      displayName: string;
      level: string | null;
      phone: string | null;
      avatarUrl: string | null;
      updatedAt: Date;
    },
    course: {
      slug: string;
      title: string;
      day: string;
      days?: string[];
      timeShort: string;
    },
    rates: Map<string, number>,
    pieces: Map<string, string>,
    stars: Map<string, number>,
    classDays?: string[] | null,
  ) {
    const assigned = assignedDays(classDays, course.days, course.day);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      level: Number(normalizeStudentLevel(user.level)),
      classId: course.slug,
      classTitle: course.title,
      classDays: assigned,
      piece: pieces.get(user.id) ?? course.title,
      lastSeen: user.updatedAt.toISOString(),
      attendanceRate: rates.get(user.id) ?? 100,
      stars: stars.get(user.id) ?? 0,
      phone: user.phone,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  private mapAssignment(row: {
    id: string;
    category: string;
    title: string;
    source: string;
    note: string;
    dueLabel: string;
    createdAt: Date;
    sessionId?: string | null;
    session?: { id: string; number: number; title: string } | null;
    course: { slug: string; title: string } | null;
    targets: Array<{
      id: string;
      studentId: string;
      progress: number;
      score?: number;
      student: { displayName: string };
    }>;
  }) {
    const progress =
      row.targets.length === 0
        ? 0
        : Math.round(
            row.targets.reduce(
              (sum, item) => sum + (item.score || item.progress),
              0,
            ) / row.targets.length,
          );
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      source: row.source,
      note: row.note,
      dueLabel: row.dueLabel,
      progress,
      createdAt: row.createdAt.toISOString(),
      sessionId: row.sessionId ?? row.session?.id ?? null,
      sessionNumber: row.session?.number ?? null,
      sessionTitle: row.session?.title ?? null,
      classId: row.course?.slug ?? null,
      classTitle: row.course?.title ?? null,
      studentIds: row.targets.map((item) => item.studentId),
      targets: row.targets.map((item) => ({
        id: item.id,
        studentId: item.studentId,
        displayName: item.student.displayName,
        progress: item.progress,
        score: item.score ?? 0,
      })),
    };
  }

  private pickWorkSession<
    T extends { id: string; number: number; title: string; courseId: string },
  >(
    studentId: string,
    sessions: T[],
    marks: Map<string, { status: AttendanceStatus; updatedAt: Date }>,
    cursorByStudentCourse: Map<string, number>,
  ): T | null {
    if (sessions.length === 0) return null;
    const courseId = sessions[0]!.courseId;
    const cursor = Math.max(
      cursorByStudentCourse.get(`${studentId}:${courseId}`) ?? 0,
      1,
    );
    const cursorSession =
      sessions.find((item) => item.number === cursor) ?? sessions[0]!;
    const prev = sessions.find((item) => item.number === cursor - 1);
    const cursorMark = marks.get(`${studentId}:${cursorSession.id}`);
    if (!cursorMark && prev) {
      const prevMark = marks.get(`${studentId}:${prev.id}`);
      if (!prevMark || this.isSameLocalDay(prevMark.updatedAt)) {
        return prev;
      }
    }
    return cursorSession;
  }

  private isSameLocalDay(value: Date) {
    const now = new Date();
    return (
      value.getFullYear() === now.getFullYear() &&
      value.getMonth() === now.getMonth() &&
      value.getDate() === now.getDate()
    );
  }

  private expandClasses<T extends { day: string; days?: string[] }>(
    classes: T[],
  ): Array<T & { day: string }> {
    return classes.flatMap((item) => {
      const days =
        item.days && item.days.length > 0
          ? item.days
          : normalizeDays(undefined, item.day);
      return (days.length > 0 ? days : [item.day]).map((day) => ({
        ...item,
        day,
      }));
    });
  }

  private nextClass(
    classes: Array<{ day: string; start: string; title: string; id: string; room: string; end: string; focus: string }>,
  ) {
    if (classes.length === 0) return null;
    const today = this.weekdayToday();
    const todayIndex = WEEKDAYS.indexOf(today as (typeof WEEKDAYS)[number]);
    const ranked = [...classes].sort((a, b) => {
      const da = (WEEKDAYS.indexOf(a.day as (typeof WEEKDAYS)[number]) - todayIndex + 7) % 7;
      const db = (WEEKDAYS.indexOf(b.day as (typeof WEEKDAYS)[number]) - todayIndex + 7) % 7;
      return da - db;
    });
    return ranked[0] ?? null;
  }

  private weekdayToday() {
    return JS_DAY_TO_WEEKDAY[new Date().getDay()] ?? 'شنبه';
  }

  private splitTime(value: string) {
    const parts = value.split(/\s*(?:—|–|-|تا)\s*/).filter(Boolean);
    return { start: parts[0] ?? value, end: parts[1] ?? '' };
  }

  private startOfDay(date: Date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  private async studentStars(studentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: studentId, course: { isActive: true } },
      include: { course: { select: { teacherId: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    if (enrollment?.course.teacherId) {
      const row = await this.prisma.studentStarRating.findUnique({
        where: {
          teacherId_studentId: {
            teacherId: enrollment.course.teacherId,
            studentId,
          },
        },
      });
      return row?.stars ?? 0;
    }
    const rows = await this.prisma.studentStarRating.findMany({
      where: { studentId },
    });
    return rows.reduce((max, row) => Math.max(max, row.stars), 0);
  }

  private async studentSessions(teacherId: string, studentId: string) {
    const [sessions, marks, homeworkRows] = await Promise.all([
      this.prisma.courseSession.findMany({
        where: {
          course: {
            teacherId,
            enrollments: { some: { userId: studentId } },
          },
        },
        include: { course: { select: { slug: true, title: true } } },
        orderBy: [{ course: { sortOrder: 'asc' } }, { number: 'asc' }],
      }),
      this.prisma.attendanceRecord.findMany({
        where: { studentId, course: { teacherId } },
      }),
      this.prisma.practiceAssignmentTarget.findMany({
        where: {
          studentId,
          assignment: {
            session: { course: { teacherId } },
            sessionId: { not: null },
          },
        },
        select: {
          assignment: {
            select: { session: { select: { courseId: true, number: true } } },
          },
        },
      }),
    ]);
    const markBySession = new Map(
      marks.map((item) => [item.meetingKey, item.status]),
    );
    const cursorByCourse = new Map<string, number>();
    for (const row of homeworkRows) {
      const session = row.assignment.session;
      if (!session) continue;
      cursorByCourse.set(
        session.courseId,
        Math.max(cursorByCourse.get(session.courseId) ?? 0, session.number),
      );
    }
    return sessions.map((session) => {
      const cursor = cursorByCourse.get(session.courseId) ?? 0;
      const attendance = markBySession.get(session.id) ?? null;
      const status = studentFacingSessionStatus(attendance);
      return {
        id: session.id,
        courseId: session.course.slug,
        courseTitle: session.course.title,
        number: session.number,
        title: session.title,
        status,
        dateLabel:
          status === 'available' && session.dateLabel === 'قفل'
            ? 'امروز'
            : status === 'locked'
              ? 'قفل'
              : session.dateLabel,
        homeworkTitle: session.homeworkTitle,
        homeworkSource: session.homeworkSource,
        homeworkNote: session.homeworkNote,
        attendance: attendance?.toLowerCase() ?? null,
        current: session.number === cursor,
        confirmed: session.number < cursor,
      };
    });
  }

  private async upsertSessionAssignment(
    teacherId: string,
    input: {
      sessionId: string;
      courseId: string;
      studentId: string;
      title: string;
      source: string;
      note: string;
    },
  ) {
    const existing = await this.prisma.practiceAssignment.findFirst({
      where: {
        teacherId,
        sessionId: input.sessionId,
        targets: { some: { studentId: input.studentId } },
      },
    });
    const category = this.inferAssignmentCategory(input.title, input.source);
    if (existing) {
      await this.prisma.practiceAssignment.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          source: input.source,
          note: input.note,
          category,
        },
      });
      return;
    }
    await this.prisma.practiceAssignment.create({
      data: {
        teacherId,
        courseId: input.courseId,
        sessionId: input.sessionId,
        category,
        title: input.title,
        source: input.source,
        note: input.note,
        dueLabel: 'کلاس بعد',
        targets: { create: { studentId: input.studentId } },
      },
    });
  }

  private async removeSessionAssignment(
    teacherId: string,
    sessionId: string,
    studentId: string,
  ) {
    const existing = await this.prisma.practiceAssignment.findFirst({
      where: {
        teacherId,
        sessionId,
        targets: { some: { studentId } },
      },
      include: { _count: { select: { targets: true } } },
    });
    if (!existing) return;
    if (existing._count.targets <= 1) {
      await this.prisma.practiceAssignment.delete({ where: { id: existing.id } });
      return;
    }
    await this.prisma.practiceAssignmentTarget.deleteMany({
      where: { assignmentId: existing.id, studentId },
    });
  }

  private inferAssignmentCategory(title: string, source: string) {
    const text = `${title} ${source}`;
    if (/هانون|hanon/i.test(text)) return 'هانون';
    if (/گام|scale/i.test(text)) return 'گام';
    if (/سلفژ|solfege/i.test(text)) return 'سلفژ';
    if (/تئوری|theory/i.test(text)) return 'تئوری';
    if (/قطعه|sonat|prelude|waltz/i.test(text)) return 'قطعه';
    return 'تکنیک';
  }

  private async requireTeacher(teacherId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: teacherId } });
    if (!user || user.role !== Role.TEACHER) {
      throw new NotFoundException('استاد یافت نشد.');
    }
    return user;
  }

  private async lastHomeworkNumber(studentId: string, courseId: string) {
    const rows = await this.prisma.practiceAssignmentTarget.findMany({
      where: {
        studentId,
        assignment: {
          OR: [{ courseId }, { session: { courseId } }],
          sessionId: { not: null },
        },
      },
      select: {
        assignment: {
          select: { session: { select: { number: true } } },
        },
      },
    });
    return rows.reduce(
      (max, row) => Math.max(max, row.assignment.session?.number ?? 0),
      0,
    );
  }

  private async syncEnrollmentCursor(studentId: string, courseId: string) {
    const homeworkCursor = await this.lastHomeworkNumber(studentId, courseId);
    await this.prisma.enrollment.updateMany({
      where: { userId: studentId, courseId },
      data: { currentSessionNumber: Math.max(homeworkCursor, 1) },
    });
  }

  private async openSessionForStudents(
    session: {
      id: string;
      number: number;
      courseId: string;
      dateLabel: string;
    },
    studentIds: string[],
    advanceCursor = false,
  ) {
    if (!advanceCursor || studentIds.length === 0) return;
    await this.prisma.enrollment.updateMany({
      where: {
        courseId: session.courseId,
        userId: { in: studentIds },
        currentSessionNumber: { lt: session.number },
      },
      data: { currentSessionNumber: session.number },
    });
  }

  private async markPresentIfUnmarked(
    session: { id: string; courseId: string },
    studentIds: string[],
    teacherId: string,
  ) {
    for (const studentId of studentIds) {
      const existing = await this.prisma.attendanceRecord.findUnique({
        where: {
          courseId_studentId_meetingKey: {
            courseId: session.courseId,
            studentId,
            meetingKey: session.id,
          },
        },
      });
      if (existing) continue;
      await this.prisma.attendanceRecord.create({
        data: {
          courseId: session.courseId,
          studentId,
          meetingKey: session.id,
          status: AttendanceStatus.PRESENT,
          markedById: teacherId,
        },
      });
    }
  }

  private async requireTaughtCourse(teacherId: string, idOrSlug: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        teacherId,
        ...courseIdentityWhere(idOrSlug),
      },
    });
    if (!course) throw new NotFoundException('این دوره برای شما ثبت نشده است.');
    return course;
  }

  private async requireStudentOfTeacher(
    teacherId: string,
    studentId: string,
    courseId?: string,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        ...(courseId ? { courseId } : { course: { teacherId } }),
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('این هنرجو در کلاس‌های شما نیست.');
    }
    return enrollment;
  }

  private async resolveTargets(
    teacherId: string,
    courseId: string | null,
    studentIds?: string[],
  ) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        course: { teacherId },
        ...(courseId ? { courseId } : {}),
        user: { role: Role.STUDENT, isActive: true },
      },
      select: { userId: true },
    });
    const allowed = new Set(enrollments.map((item) => item.userId));
    if (!studentIds || studentIds.length === 0) return [...allowed];
    return studentIds.filter((id) => allowed.has(id));
  }

  private async attendanceRates(teacherId: string, studentIds: string[]) {
    const result = new Map<string, number>();
    if (studentIds.length === 0) return result;
    const rows = await this.prisma.attendanceRecord.findMany({
      where: { studentId: { in: studentIds }, course: { teacherId } },
    });
    const grouped = new Map<string, AttendanceStatus[]>();
    for (const row of rows) {
      const list = grouped.get(row.studentId) ?? [];
      list.push(row.status);
      grouped.set(row.studentId, list);
    }
    for (const studentId of studentIds) {
      const list = grouped.get(studentId) ?? [];
      if (list.length === 0) {
        result.set(studentId, 100);
        continue;
      }
      const present = list.filter(
        (status) =>
          status === AttendanceStatus.PRESENT ||
          status === AttendanceStatus.LATE,
      ).length;
      result.set(studentId, Math.round((present / list.length) * 100));
    }
    return result;
  }

  private async starRatings(teacherId: string, studentIds: string[]) {
    const result = new Map<string, number>();
    if (studentIds.length === 0) return result;
    const rows = await this.prisma.studentStarRating.findMany({
      where: { teacherId, studentId: { in: studentIds } },
    });
    for (const row of rows) result.set(row.studentId, row.stars);
    return result;
  }

  private async latestPieces(teacherId: string, studentIds: string[]) {
    const result = new Map<string, string>();
    if (studentIds.length === 0) return result;
    const rows = await this.prisma.practiceAssignmentTarget.findMany({
      where: {
        studentId: { in: studentIds },
        assignment: { teacherId, category: 'قطعه' },
      },
      include: { assignment: { select: { title: true, createdAt: true } } },
      orderBy: { assignment: { createdAt: 'desc' } },
    });
    for (const row of rows) {
      if (!result.has(row.studentId)) {
        result.set(row.studentId, row.assignment.title);
      }
    }
    return result;
  }

  private async averageAttendance(teacherId: string) {
    const students = await this.prisma.enrollment.findMany({
      where: { course: { teacherId } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const rates = await this.attendanceRates(
      teacherId,
      students.map((item) => item.userId),
    );
    if (rates.size === 0) return 100;
    const values = [...rates.values()];
    return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
  }
}
