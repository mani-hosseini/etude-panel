import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName, normalizeStudentLevel } from '../common/utils/mappers';
import type { AuthUser } from '../common/decorators/auth.decorators';
import {
  AdminLoginDto,
  LoginDto,
  RegisterDto,
  RegisterStudentDto,
} from './dto/auth.dto';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async loginStudent(dto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const firstName = normalizeName(dto.firstName);
    const lastName = normalizeName(dto.lastName);

    const user = await this.prisma.user.findFirst({
      where: {
        firstName,
        lastName,
        role: Role.STUDENT,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('نام فارسی یا رمز عبور نادرست است.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('نام فارسی یا رمز عبور نادرست است.');
    }

    const tokens = await this.issueTokens(user.id, user.role, meta);
    return {
      ...tokens,
      user: this.toPublicUser(user),
      session: {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        loggedInAt: new Date().toISOString(),
        studentCode: user.studentCode,
      },
    };
  }

  async loginAdmin(dto: AdminLoginDto, meta?: { ip?: string; userAgent?: string }) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, role: Role.ADMIN, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور نادرست است.');
    }

    const tokens = await this.issueTokens(user.id, user.role, meta);
    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  /** ثبت‌نام عمومی هنرجو */
  async registerPublic(
    dto: RegisterDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const firstName = normalizeName(dto.firstName);
    const lastName = normalizeName(dto.lastName);

    const existing = await this.prisma.user.findFirst({
      where: { firstName, lastName },
    });
    if (existing) {
      throw new ConflictException(
        'حسابی با این نام و نام خانوادگی از قبل وجود دارد. وارد شوید.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);
    const studentCode = await this.generateStudentCode();

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        passwordHash,
        passwordPlain: dto.password,
        role: Role.STUDENT,
        studentCode,
        level: '1',
      },
    });

    const achievement = await this.prisma.achievement.findUnique({
      where: { code: 'joined' },
    });
    if (achievement) {
      await this.prisma.userAchievement.create({
        data: { userId: user.id, achievementId: achievement.id },
      });
    }

    const tokens = await this.issueTokens(user.id, user.role, meta);
    return {
      ...tokens,
      user: this.toPublicUser(user),
      session: {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        loggedInAt: new Date().toISOString(),
        studentCode: user.studentCode,
      },
    };
  }

  async registerStudent(dto: RegisterStudentDto) {
    const firstName = normalizeName(dto.firstName);
    const lastName = normalizeName(dto.lastName);
    const studentCode =
      dto.studentCode?.trim().toUpperCase() ||
      (await this.generateStudentCode());

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ firstName, lastName }, { studentCode }],
      },
    });
    if (existing) {
      throw new ConflictException('هنرجو با این مشخصات از قبل وجود دارد.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        passwordHash,
        passwordPlain: dto.password,
        role: Role.STUDENT,
        studentCode,
        level: normalizeStudentLevel(dto.level),
      },
    });

    return this.toPublicUser(user);
  }

  async refresh(refreshToken: string, meta?: { ip?: string; userAgent?: string }) {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر است.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('توکن تازه‌سازی نامعتبر است.');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored || !stored.user.isActive) {
      throw new UnauthorizedException('توکن تازه‌سازی منقضی یا باطل شده است.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.role, meta);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { loggedOut: true };
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }

  async me(user: AuthUser) {
    const full = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        studentCode: true,
        email: true,
        role: true,
        level: true,
        createdAt: true,
      },
    });

    return {
      ...full,
      session: {
        firstName: full.firstName,
        lastName: full.lastName,
        displayName: full.displayName,
        loggedInAt: new Date().toISOString(),
        studentCode: full.studentCode,
      },
    };
  }

  private async generateStudentCode() {
    const year = new Date().getFullYear();
    for (let i = 0; i < 8; i++) {
      const suffix = randomBytes(2).toString('hex').toUpperCase();
      const code = `ET-${year}-${suffix}`;
      const exists = await this.prisma.user.findUnique({
        where: { studentCode: code },
      });
      if (!exists) return code;
    }
    return `ET-${year}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private async issueTokens(
    userId: string,
    role: Role,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const accessExpiresIn = this.config.getOrThrow<string>(
      'jwt.accessExpiresIn',
    );
    const refreshExpiresIn = this.config.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    const accessToken = await this.jwt.signAsync(
      { sub: userId, role, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: userId,
        role,
        type: 'refresh',
        jti: randomBytes(16).toString('hex'),
      },
      {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    const expiresAt = this.parseExpiryDate(refreshExpiresIn);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent?.slice(0, 512),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryDate(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    const now = Date.now();
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === 's'
        ? amount * 1000
        : unit === 'm'
          ? amount * 60 * 1000
          : unit === 'h'
            ? amount * 60 * 60 * 1000
            : amount * 24 * 60 * 60 * 1000;
    return new Date(now + ms);
  }

  private toPublicUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    studentCode: string | null;
    email: string | null;
    role: Role;
    level: string | null;
    avatarUrl?: string | null;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      studentCode: user.studentCode,
      email: user.email,
      role: user.role,
      level: normalizeStudentLevel(user.level),
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}
