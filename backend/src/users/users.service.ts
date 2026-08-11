import {
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
import { normalizeName, isUuid } from '../common/utils/mappers';
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

    return {
      data: {
        users: users.map((user) => this.mapUser(user)),
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

    const avgProgress = await this.computeAvgProgress(id);

    return {
      ...this.mapUser({ ...user, avgProgress }),
      enrollments: user.enrollments.map((item) => ({
        id: item.id,
        joinedAt: item.joinedAt,
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
        ...(dto.level !== undefined ? { level: dto.level } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.studentCode !== undefined
          ? { studentCode: dto.studentCode.trim().toUpperCase() }
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
        ...(dto.password
          ? {
              passwordHash: await argon2.hash(dto.password),
              passwordPlain: dto.password,
            }
          : {}),
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

  private async computeAvgProgress(userId: string): Promise<number> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    if (enrollments.length === 0) return 0;

    const sessions = await this.prisma.courseSession.findMany({
      where: {
        courseId: { in: enrollments.map((e) => e.courseId) },
        status: 'AVAILABLE',
      },
      include: { _count: { select: { slides: true } } },
    });
    if (sessions.length === 0) return 0;

    const progresses = await this.prisma.sessionProgress.findMany({
      where: {
        userId,
        sessionId: { in: sessions.map((s) => s.id) },
      },
    });
    const bySession = new Map(progresses.map((p) => [p.sessionId, p]));

    let sum = 0;
    for (const session of sessions) {
      const row = bySession.get(session.id);
      const slideCount = session._count.slides;
      if (row && slideCount > 0) {
        sum += Math.round(((row.lastSlideIndex + 1) / slideCount) * 100);
      }
    }
    return Math.round(sum / sessions.length);
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
    phone?: string | null;
    nationalId?: string | null;
    address?: string | null;
    passwordPlain?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count?: { enrollments: number; achievements: number };
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
      level: user.level,
      phone: user.phone ?? null,
      nationalId: user.nationalId ?? null,
      address: user.address ?? null,
      password: user.passwordPlain ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      enrollmentsCount: user._count?.enrollments ?? 0,
      achievementsCount: user._count?.achievements ?? 0,
      avgProgress: user.avgProgress ?? 0,
    };
  }
}
