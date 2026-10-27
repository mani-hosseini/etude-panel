import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPaginationMeta,
} from '../common/dto/pagination-query.dto';
import {
  normalizeName,
  normalizeNationalId,
  normalizeStudentLevel,
  slideProgressPercent,
} from '../common/utils/mappers';
import {
  EnrollCourseDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateEnrollmentDaysDto,
  UpdateUserDto,
} from './dto/users.dto';
import { normalizeDays } from '../common/utils/weekdays';
import { courseIdentityWhere } from '../common/utils/slug';

const userPublicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
  role: true,
  studentCode: true,
  level: true,
  avatarUrl: true,
  phone: true,
  nationalId: true,
  address: true,
  title: true,
  instrument: true,
  room: true,
  bio: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      enrollments: true,
      achievements: true,
      taughtCourses: true,
    },
  },
} satisfies Prisma.UserSelect;

const userDetailSelect = {
  ...userPublicSelect,
  passwordPlain: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.teacherId
        ? {
            enrollments: {
              some: {
                course: { teacherId: query.teacherId },
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                firstName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                studentCode: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                nationalId: {
                  contains: normalizeNationalId(query.search) || query.search,
                },
              },
              {
                phone: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy = this.parseSort(query.sort);

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    const progressByUser = await this.computeProgressByUser(
      users.map((user) => user.id),
    );

    return {
      data: {
        users: users.map((user) =>
          this.mapUser({
            ...user,
            avgProgress: progressByUser.get(user.id) ?? 0,
          }),
        ),
      },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userDetailSelect,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                title: true,
                teacher: true,
                status: true,
                instrument: true,
                sessionsTotal: true,
                day: true,
                days: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'asc' },
        },
        taughtCourses: {
          select: {
            id: true,
            slug: true,
            title: true,
            teacher: true,
            status: true,
            instrument: true,
            day: true,
            days: true,
            timeShort: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    const avgProgress = await this.computeAvgProgress(id);
    const courseProgress = await this.computeProgressByCourse(id);

    const examGrades =
      user.role === Role.STUDENT
        ? await this.listExamGradesForStudent(id)
        : [];

    return {
      ...this.mapUser({ ...user, avgProgress }),
      examGrades,
      enrollments: user.enrollments.map((item) => {
        const stats = courseProgress.get(item.course.id);
        return {
          id: item.id,
          joinedAt: item.joinedAt,
          progress: stats?.progress ?? 0,
          sessionsDone: stats?.sessionsDone ?? 0,
          sessionsTotal: item.course.sessionsTotal,
          currentSessionNumber: item.currentSessionNumber,
          classDays: item.classDays ?? [],
          course: {
            id: item.course.slug,
            uuid: item.course.id,
            title: item.course.title,
            teacher: item.course.teacher,
            status: item.course.status.toLowerCase(),
            instrument: item.course.instrument,
            day: item.course.day,
            days: item.course.days ?? [],
          },
        };
      }),
      achievements: user.achievements.map((item) => ({
        id: item.achievement.code,
        title: item.achievement.title,
        desc: item.achievement.description,
        earnedAt: item.earnedAt,
      })),
      taughtCourses: user.taughtCourses.map((course) => ({
        id: course.slug,
        uuid: course.id,
        title: course.title,
        teacher: course.teacher,
        status: course.status.toLowerCase(),
        instrument: course.instrument,
        day: course.day,
        days: course.days ?? [],
        timeShort: course.timeShort,
      })),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

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
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictException(
          'کاربر دیگری با این نام و نام خانوادگی وجود دارد.',
        );
      }
    }

    if (dto.studentCode) {
      const code = dto.studentCode.trim().toUpperCase();
      const duplicateCode = await this.prisma.user.findFirst({
        where: { studentCode: code, NOT: { id } },
      });
      if (duplicateCode) {
        throw new ConflictException('کد هنرجو تکراری است.');
      }
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const duplicateEmail = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (duplicateEmail) {
        throw new ConflictException('ایمیل تکراری است.');
      }
    }

    const nationalId =
      dto.nationalId !== undefined
        ? normalizeNationalId(dto.nationalId) || null
        : undefined;
    if (nationalId) {
      const duplicateNationalId = await this.prisma.user.findFirst({
        where: { nationalId, NOT: { id } },
      });
      if (duplicateNationalId) {
        throw new ConflictException('کد ملی تکراری است.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName || dto.lastName
          ? {
              firstName,
              lastName,
              displayName: `${firstName} ${lastName}`,
            }
          : {}),
        ...(dto.email !== undefined
          ? { email: dto.email.trim().toLowerCase() || null }
          : {}),
        ...(dto.level !== undefined
          ? { level: normalizeStudentLevel(dto.level) }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.studentCode !== undefined
          ? { studentCode: dto.studentCode.trim().toUpperCase() }
          : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone.trim() || null }
          : {}),
        ...(nationalId !== undefined ? { nationalId } : {}),
        ...(dto.address !== undefined
          ? { address: dto.address.trim() || null }
          : {}),
        ...(dto.password
          ? {
              passwordHash: await argon2.hash(dto.password),
              passwordPlain: dto.password,
            }
          : nationalId &&
              nationalId !== existing.nationalId &&
              existing.role !== Role.ADMIN
            ? {
                passwordHash: await argon2.hash(nationalId),
                passwordPlain: nationalId,
              }
            : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
        ...(dto.instrument !== undefined
          ? { instrument: dto.instrument.trim() || null }
          : {}),
        ...(dto.room !== undefined ? { room: dto.room.trim() || null } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() || null } : {}),
      },
      select: userDetailSelect,
    });

    if (dto.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.mapUser(updated);
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    const passwordHash = await argon2.hash(dto.password);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, passwordPlain: dto.password },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { reset: true, password: dto.password };
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }

  async activate(id: string) {
    return this.update(id, { isActive: true });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد.');
    }
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('حذف حساب ادمین مجاز نیست.');
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async enroll(userId: string, dto: EnrollCourseDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد.');
    }
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('فقط هنرجو را می‌توان در دوره ثبت کرد.');
    }

    const course = await this.prisma.course.findFirst({
      where: courseIdentityWhere(dto.courseId),
    });
    if (!course) {
      throw new NotFoundException('دوره یافت نشد.');
    }

    const allowed = normalizeDays(course.days, course.day);
    const requested = normalizeDays(dto.classDays);
    const assigned =
      requested.length > 0
        ? requested.filter((day) => allowed.includes(day))
        : allowed;
    if (dto.classDays && dto.classDays.length > 0 && assigned.length === 0) {
      throw new BadRequestException(
        'روز کلاس هنرجو باید از روزهای برگزاری همین دوره باشد.',
      );
    }
    if (assigned.length === 0) {
      throw new BadRequestException('روز برگزاری این دوره مشخص نشده است.');
    }

    try {
      const enrollment = await this.prisma.enrollment.create({
        data: { userId, courseId: course.id, classDays: assigned },
        include: {
          course: {
            select: { slug: true, title: true },
          },
        },
      });
      return {
        id: enrollment.id,
        joinedAt: enrollment.joinedAt,
        courseId: enrollment.course.slug,
        courseTitle: enrollment.course.title,
        classDays: assigned,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('هنرجو از قبل در این دوره ثبت شده است.');
      }
      throw error;
    }
  }

  async updateEnrollmentDays(
    userId: string,
    courseId: string,
    dto: UpdateEnrollmentDaysDto,
  ) {
    const course = await this.prisma.course.findFirst({
      where: courseIdentityWhere(courseId),
    });
    if (!course) {
      throw new NotFoundException('دوره یافت نشد.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });
    if (!enrollment) {
      throw new NotFoundException('ثبت‌نام در این دوره یافت نشد.');
    }

    const allowed = normalizeDays(course.days, course.day);
    const classDays = normalizeDays(dto.classDays).filter((day) =>
      allowed.includes(day),
    );
    if (classDays.length === 0) {
      throw new BadRequestException(
        'حداقل یک روز برگزاری از روزهای همین دوره انتخاب کنید.',
      );
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { classDays },
    });
    return {
      id: updated.id,
      courseId: course.slug,
      classDays: updated.classDays,
    };
  }

  async unenroll(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: courseIdentityWhere(courseId),
    });
    if (!course) {
      throw new NotFoundException('دوره یافت نشد.');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: course.id },
      },
    });
    if (!enrollment) {
      throw new NotFoundException('ثبت‌نام در این دوره یافت نشد.');
    }

    await this.prisma.enrollment.delete({ where: { id: enrollment.id } });
    return { removed: true };
  }

  async assignTaughtCourse(userId: string, dto: EnrollCourseDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('استاد یافت نشد.');
    }
    if (user.role !== Role.TEACHER) {
      throw new ForbiddenException('فقط به استاد می‌توان دوره تدریس داد.');
    }

    const course = await this.prisma.course.findFirst({
      where: courseIdentityWhere(dto.courseId),
    });
    if (!course) {
      throw new NotFoundException('دوره یافت نشد.');
    }

    const updated = await this.prisma.course.update({
      where: { id: course.id },
      data: {
        teacherId: user.id,
        teacher: user.displayName,
        teacherShort: user.lastName,
      },
      select: { slug: true, title: true },
    });

    return {
      courseId: updated.slug,
      courseTitle: updated.title,
      teacherId: user.id,
    };
  }

  async unassignTaughtCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        ...courseIdentityWhere(courseId),
        teacherId: userId,
      },
    });
    if (!course) {
      throw new NotFoundException('این دوره برای این استاد ثبت نشده است.');
    }

    await this.prisma.course.update({
      where: { id: course.id },
      data: { teacherId: null },
    });
    return { removed: true };
  }

  async stats() {
    const [total, students, teachers, admins, active, inactive] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: Role.STUDENT } }),
        this.prisma.user.count({ where: { role: Role.TEACHER } }),
        this.prisma.user.count({ where: { role: Role.ADMIN } }),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: false } }),
      ]);

    return { total, students, teachers, admins, active, inactive };
  }

  private async listExamGradesForStudent(userId: string) {
    const [exams, grades] = await Promise.all([
      this.prisma.exam.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, title: true, status: true },
      }),
      this.prisma.examGrade.findMany({ where: { userId } }),
    ]);
    const gradeByExam = new Map(grades.map((row) => [row.examId, row]));
    return exams.map((exam) => {
      const grade = gradeByExam.get(exam.id);
      const score = grade == null ? null : Number(grade.score);
      return {
        examId: exam.id,
        title: exam.title,
        status: exam.status,
        score: Number.isFinite(score as number) ? score : null,
        gradedAt: grade?.gradedAt.toISOString() ?? null,
      };
    });
  }

  private async computeAvgProgress(userId: string): Promise<number> {
    const byUser = await this.computeProgressByUser([userId]);
    return byUser.get(userId) ?? 0;
  }

  private async computeProgressByUser(
    userIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.loadSessionPercents(userIds);
    const grouped = new Map<string, number[]>();
    for (const row of rows) {
      const list = grouped.get(row.userId) ?? [];
      list.push(row.percent);
      grouped.set(row.userId, list);
    }
    const result = new Map<string, number>();
    for (const userId of userIds) {
      result.set(userId, this.average(grouped.get(userId) ?? []));
    }
    return result;
  }

  private async computeProgressByCourse(userId: string): Promise<
    Map<string, { progress: number; sessionsDone: number; sessionsTotal: number }>
  > {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: {
        courseId: true,
        course: { select: { sessionsTotal: true } },
      },
    });
    const homeworkRows = await this.prisma.practiceAssignmentTarget.findMany({
      where: {
        studentId: userId,
        assignment: {
          OR: [
            { courseId: { in: enrollments.map((item) => item.courseId) } },
            {
              session: {
                courseId: { in: enrollments.map((item) => item.courseId) },
              },
            },
          ],
          sessionId: { not: null },
        },
      },
      select: {
        assignment: {
          select: {
            courseId: true,
            session: { select: { number: true, courseId: true } },
          },
        },
      },
    });
    const homeworkMap = new Map<string, number>();
    for (const row of homeworkRows) {
      const courseId =
        row.assignment.courseId ?? row.assignment.session?.courseId ?? null;
      const number = row.assignment.session?.number ?? 0;
      if (!courseId || number <= 0) continue;
      homeworkMap.set(courseId, Math.max(homeworkMap.get(courseId) ?? 0, number));
    }

    const result = new Map<
      string,
      { progress: number; sessionsDone: number; sessionsTotal: number }
    >();
    for (const item of enrollments) {
      const sessionsDone = homeworkMap.get(item.courseId) ?? 0;
      result.set(item.courseId, {
        progress:
          item.course.sessionsTotal > 0
            ? Math.round((sessionsDone / item.course.sessionsTotal) * 100)
            : 0,
        sessionsDone,
        sessionsTotal: item.course.sessionsTotal,
      });
    }
    return result;
  }

  private async loadSessionPercents(userIds: string[]): Promise<
    Array<{ userId: string; courseId: string; percent: number }>
  > {
    if (userIds.length === 0) return [];

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, courseId: true },
    });
    if (enrollments.length === 0) return [];

    const sessions = await this.prisma.courseSession.findMany({
      where: {
        courseId: { in: [...new Set(enrollments.map((item) => item.courseId))] },
        status: 'AVAILABLE',
      },
      include: { _count: { select: { slides: true } } },
    });
    if (sessions.length === 0) return [];

    const progresses = await this.prisma.sessionProgress.findMany({
      where: {
        userId: { in: userIds },
        sessionId: { in: sessions.map((session) => session.id) },
      },
    });
    const progressKey = new Map(
      progresses.map((row) => [`${row.userId}:${row.sessionId}`, row]),
    );
    const sessionsByCourse = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const list = sessionsByCourse.get(session.courseId) ?? [];
      list.push(session);
      sessionsByCourse.set(session.courseId, list);
    }

    const rows: Array<{ userId: string; courseId: string; percent: number }> =
      [];
    for (const enrollment of enrollments) {
      for (const session of sessionsByCourse.get(enrollment.courseId) ?? []) {
        const row = progressKey.get(`${enrollment.userId}:${session.id}`);
        const slideCount = session._count.slides;
        rows.push({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          percent: row
            ? slideProgressPercent(
                row.lastSlideIndex,
                slideCount,
                row.completedAt,
              )
            : 0,
        });
      }
    }
    return rows;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private parseSort(sort?: string): Prisma.UserOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const [field, direction] = sort.split(':');
    const dir = direction === 'asc' ? 'asc' : 'desc';
    const allowed = new Set([
      'createdAt',
      'updatedAt',
      'firstName',
      'lastName',
      'displayName',
      'studentCode',
    ]);
    if (!field || !allowed.has(field)) {
      return { createdAt: 'desc' };
    }
    return { [field]: dir } as Prisma.UserOrderByWithRelationInput;
  }

  private mapUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string | null;
    role: Role;
    studentCode: string | null;
    level: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
    nationalId?: string | null;
    address?: string | null;
    title?: string | null;
    instrument?: string | null;
    room?: string | null;
    bio?: string | null;
    passwordPlain?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
      enrollments: number;
      achievements: number;
      taughtCourses?: number;
    };
    avgProgress?: number;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      studentCode: user.studentCode,
      level: user.role === Role.STUDENT ? normalizeStudentLevel(user.level) : null,
      avatarUrl: user.avatarUrl ?? null,
      phone: user.phone ?? null,
      nationalId: user.nationalId ?? null,
      address: user.address ?? null,
      title: user.title ?? null,
      instrument: user.instrument ?? null,
      room: user.room ?? null,
      bio: user.bio ?? null,
      password: user.passwordPlain ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      enrollmentsCount: user._count?.enrollments ?? 0,
      achievementsCount: user._count?.achievements ?? 0,
      taughtCoursesCount: user._count?.taughtCourses ?? 0,
      avgProgress: user.avgProgress ?? 0,
    };
  }
}
