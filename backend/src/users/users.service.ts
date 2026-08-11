import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SessionStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildPaginationMeta,
} from '../common/dto/pagination-query.dto';
import { isUuid } from '../common/utils/mappers';
import {
  EnrollCourseDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/users.dto';

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
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      enrollments: true,
      achievements: true,
    },
  },
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
                phone: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                nationalId: {
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

    const progressByUser = await this.computeAvgViewProgress(
      users.map((user) => user.id),
    );

    return {
      data: {
        users: users.map((user) =>
          this.mapUser(user, progressByUser.get(user.id) ?? 0),
        ),
      },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userPublicSelect,
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
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    const courseIds = user.enrollments.map((e) => e.course.id);
    const [avgViewProgress, courseProgress] = await Promise.all([
      this.computeAvgViewProgress([id]).then((m) => m.get(id) ?? 0),
      this.computeCourseViewProgress(id, courseIds),
    ]);

    return {
      ...this.mapUser(user, avgViewProgress),
      enrollments: user.enrollments.map((item) => ({
        id: item.id,
        joinedAt: item.joinedAt,
        viewProgress: courseProgress.get(item.course.id) ?? 0,
        course: {
          id: item.course.slug,
          uuid: item.course.id,
          title: item.course.title,
          teacher: item.course.teacher,
          status: item.course.status.toLowerCase(),
          instrument: item.course.instrument,
        },
      })),
      achievements: user.achievements.map((item) => ({
        id: item.achievement.code,
        title: item.achievement.title,
        desc: item.achievement.description,
        earnedAt: item.earnedAt,
      })),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    if (dto.isActive === undefined) {
      throw new ForbiddenException(
        'ادمین فقط می‌تواند رمز عبور را تغییر دهد یا وضعیت فعال بودن را تنظیم کند.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: userPublicSelect,
    });

    const avgViewProgress =
      (await this.computeAvgViewProgress([id])).get(id) ?? 0;
    return this.mapUser(updated, avgViewProgress);
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    const passwordHash = await argon2.hash(dto.password);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { reset: true };
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

    const course = await this.prisma.course.findFirst({
      where: {
        OR: isUuid(dto.courseId)
          ? [{ id: dto.courseId }, { slug: dto.courseId }]
          : [{ slug: dto.courseId }],
        isActive: true,
      },
    });
    if (!course) {
      throw new NotFoundException('دوره یافت نشد.');
    }

    try {
      const enrollment = await this.prisma.enrollment.create({
        data: { userId, courseId: course.id },
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

  async unenroll(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: isUuid(courseId)
          ? [{ id: courseId }, { slug: courseId }]
          : [{ slug: courseId }],
      },
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

  async stats() {
    const [total, students, admins, active, inactive] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
    ]);

    return { total, students, admins, active, inactive };
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

  private mapUser(
    user: {
      id: string;
      firstName: string;
      lastName: string;
      displayName: string;
      email: string | null;
      role: Role;
      studentCode: string | null;
      level: string | null;
      phone: string | null;
      nationalId: string | null;
      address: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      _count?: { enrollments: number; achievements: number };
    },
    avgViewProgress = 0,
  ) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      studentCode: user.studentCode,
      level: user.level,
      phone: user.phone,
      nationalId: user.nationalId,
      address: user.address,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      enrollmentsCount: user._count?.enrollments ?? 0,
      achievementsCount: user._count?.achievements ?? 0,
      avgViewProgress,
    };
  }

  /** Mean slide-view progress across available sessions with slides. */
  private async computeAvgViewProgress(userIds: string[]) {
    const result = new Map<string, number>();
    for (const id of userIds) result.set(id, 0);
    if (userIds.length === 0) return result;

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, courseId: true },
    });
    if (enrollments.length === 0) return result;

    const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
    const sessions = await this.prisma.courseSession.findMany({
      where: {
        courseId: { in: courseIds },
        status: SessionStatus.AVAILABLE,
      },
      select: {
        id: true,
        courseId: true,
        _count: { select: { slides: true } },
      },
    });
    const sessionsWithSlides = sessions.filter((s) => s._count.slides > 0);
    if (sessionsWithSlides.length === 0) return result;

    const progressRows = await this.prisma.sessionProgress.findMany({
      where: {
        userId: { in: userIds },
        sessionId: { in: sessionsWithSlides.map((s) => s.id) },
      },
      select: {
        userId: true,
        sessionId: true,
        lastSlideIndex: true,
        completedAt: true,
      },
    });

    const progressMap = new Map(
      progressRows.map((row) => [`${row.userId}:${row.sessionId}`, row]),
    );

    const coursesByUser = new Map<string, string[]>();
    for (const enrollment of enrollments) {
      const list = coursesByUser.get(enrollment.userId) ?? [];
      list.push(enrollment.courseId);
      coursesByUser.set(enrollment.userId, list);
    }

    const sessionsByCourse = new Map<string, typeof sessionsWithSlides>();
    for (const session of sessionsWithSlides) {
      const list = sessionsByCourse.get(session.courseId) ?? [];
      list.push(session);
      sessionsByCourse.set(session.courseId, list);
    }

    for (const userId of userIds) {
      const userSessions = (coursesByUser.get(userId) ?? []).flatMap(
        (courseId) => sessionsByCourse.get(courseId) ?? [],
      );
      if (userSessions.length === 0) {
        result.set(userId, 0);
        continue;
      }

      let sum = 0;
      for (const session of userSessions) {
        sum += this.sessionViewPercent(
          progressMap.get(`${userId}:${session.id}`),
          session._count.slides,
        );
      }
      result.set(userId, Math.round(sum / userSessions.length));
    }

    return result;
  }

  private async computeCourseViewProgress(
    userId: string,
    courseIds: string[],
  ) {
    const result = new Map<string, number>();
    for (const id of courseIds) result.set(id, 0);
    if (courseIds.length === 0) return result;

    const sessions = await this.prisma.courseSession.findMany({
      where: {
        courseId: { in: courseIds },
        status: SessionStatus.AVAILABLE,
      },
      select: {
        id: true,
        courseId: true,
        _count: { select: { slides: true } },
      },
    });
    const sessionsWithSlides = sessions.filter((s) => s._count.slides > 0);
    if (sessionsWithSlides.length === 0) return result;

    const progressRows = await this.prisma.sessionProgress.findMany({
      where: {
        userId,
        sessionId: { in: sessionsWithSlides.map((s) => s.id) },
      },
      select: {
        sessionId: true,
        lastSlideIndex: true,
        completedAt: true,
      },
    });
    const progressMap = new Map(
      progressRows.map((row) => [row.sessionId, row]),
    );

    const byCourse = new Map<string, typeof sessionsWithSlides>();
    for (const session of sessionsWithSlides) {
      const list = byCourse.get(session.courseId) ?? [];
      list.push(session);
      byCourse.set(session.courseId, list);
    }

    for (const courseId of courseIds) {
      const courseSessions = byCourse.get(courseId) ?? [];
      if (courseSessions.length === 0) {
        result.set(courseId, 0);
        continue;
      }
      let sum = 0;
      for (const session of courseSessions) {
        sum += this.sessionViewPercent(
          progressMap.get(session.id),
          session._count.slides,
        );
      }
      result.set(courseId, Math.round(sum / courseSessions.length));
    }

    return result;
  }

  private sessionViewPercent(
    progress:
      | {
          lastSlideIndex: number;
          completedAt: Date | null;
        }
      | undefined,
    slideCount: number,
  ) {
    if (slideCount <= 0) return 0;
    if (!progress) return 0;
    if (
      progress.completedAt ||
      progress.lastSlideIndex >= slideCount - 1
    ) {
      return 100;
    }
    return Math.min(
      100,
      Math.round(((progress.lastSlideIndex + 1) / slideCount) * 100),
    );
  }
}
