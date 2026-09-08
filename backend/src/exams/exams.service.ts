import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ExamStatus, Prisma } from '@prisma/client';
import {
  buildPaginationMeta,
} from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  AdminListExamsQueryDto,
  UpsertExamDto,
} from './dto/exams.dto';

const IMAGE_PATH_RE = /^\/uploads\/exams\/[A-Za-z0-9._-]+$/;

export function sanitizeOriginalName(name: string): string {
  const cleaned = (name || 'submission.pdf')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim()
    .slice(0, 180);
  const base = cleaned || 'submission.pdf';
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

export function pdfContentDisposition(filename: string): string {
  const ascii =
    filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') ||
    'submission.pdf';
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async listForStudent(userId: string) {
    const exams = await this.prisma.exam.findMany({
      where: { status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        submissions: {
          where: { userId },
          select: {
            id: true,
            submittedAt: true,
            originalName: true,
            size: true,
          },
        },
      },
    });

    return {
      exams: exams.map((exam) => {
        const submission = exam.submissions[0] ?? null;
        return this.mapStudentExam(exam, submission);
      }),
    };
  }

  async getForStudent(userId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        submissions: {
          where: { userId },
          select: {
            id: true,
            submittedAt: true,
            originalName: true,
            filename: true,
            size: true,
          },
        },
      },
    });
    if (!exam || exam.status === ExamStatus.DRAFT) {
      throw new NotFoundException('آزمون یافت نشد.');
    }
    const submission = exam.submissions[0] ?? null;
    return this.mapStudentExam(exam, submission, true);
  }

  async submitPdf(userId: string, examId: string, file: Express.Multer.File) {
    const exam = await this.ensureExam(examId);
    this.assertStudentCanSubmit(exam);

    const stored = await this.uploads.savePdf(file);
    const originalName = sanitizeOriginalName(file.originalname ?? stored.filename);

    try {
      const previous = await this.prisma.examSubmission.findUnique({
        where: { examId_userId: { examId, userId } },
      });

      const row = await this.prisma.examSubmission.upsert({
        where: { examId_userId: { examId, userId } },
        create: {
          examId,
          userId,
          fileKey: stored.key,
          filename: stored.filename,
          originalName,
          mimeType: stored.mimeType,
          size: stored.size,
        },
        update: {
          fileKey: stored.key,
          filename: stored.filename,
          originalName,
          mimeType: stored.mimeType,
          size: stored.size,
          submittedAt: new Date(),
        },
      });

      if (previous?.fileKey && previous.fileKey !== stored.key) {
        await this.uploads.removeByKey(previous.fileKey);
      }

      return {
        submitted: true,
        submission: this.mapStudentSubmission(row),
      };
    } catch (error) {
      await this.uploads.removeByKey(stored.key);
      throw error;
    }
  }

  async downloadOwnPdf(userId: string, examId: string) {
    const submission = await this.prisma.examSubmission.findUnique({
      where: { examId_userId: { examId, userId } },
    });
    if (!submission) {
      throw new NotFoundException('پاسخ این آزمون هنوز ارسال نشده است.');
    }
    return this.streamPrivatePdf(submission.fileKey, submission.originalName);
  }

  async listForAdmin(query: AdminListExamsQueryDto) {
    const where: Prisma.ExamWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            title: { contains: query.search, mode: 'insensitive' },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.exam.count({ where }),
      this.prisma.exam.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { _count: { select: { submissions: true } } },
      }),
    ]);

    return {
      data: {
        exams: rows.map((exam) => this.mapAdminExam(exam)),
      },
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getForAdmin(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        _count: { select: { submissions: true } },
        submissions: {
          orderBy: { submittedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                studentCode: true,
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('آزمون یافت نشد.');
    return {
      ...this.mapAdminExam(exam),
      submissions: exam.submissions.map((row) => ({
        id: row.id,
        examId: row.examId,
        submittedAt: row.submittedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        originalName: row.originalName,
        filename: row.filename,
        mimeType: row.mimeType,
        size: row.size,
        student: {
          id: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          displayName: row.user.displayName,
          studentCode: row.user.studentCode,
        },
      })),
    };
  }

  async create(dto: UpsertExamDto) {
    const status = dto.status ?? ExamStatus.DRAFT;
    this.assertPublishable(status, '', '');

    const maxOrder = await this.prisma.exam.aggregate({
      _max: { sortOrder: true },
    });

    const exam = await this.prisma.exam.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        status,
        dueAt: dto.dueAt ?? null,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { _count: { select: { submissions: true } } },
    });
    return this.mapAdminExam(exam);
  }

  async update(examId: string, dto: UpsertExamDto) {
    const existing = await this.ensureExam(examId);
    const nextStatus = dto.status ?? existing.status;
    this.assertPublishable(
      nextStatus,
      existing.examImagePath,
      existing.answerImagePath,
    );

    const exam = await this.prisma.exam.update({
      where: { id: examId },
      data: {
        title: dto.title.trim(),
        description:
          dto.description !== undefined
            ? dto.description.trim()
            : existing.description,
        status: nextStatus,
        dueAt: dto.dueAt === undefined ? existing.dueAt : dto.dueAt,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
      include: { _count: { select: { submissions: true } } },
    });
    return this.mapAdminExam(exam);
  }

  async remove(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { submissions: { select: { fileKey: true } } },
    });
    if (!exam) throw new NotFoundException('آزمون یافت نشد.');

    await this.prisma.exam.delete({ where: { id: examId } });

    const keys = [
      ...exam.submissions.map((row) => row.fileKey),
      this.uploads.keyFromPublicPath(exam.examImagePath),
      this.uploads.keyFromPublicPath(exam.answerImagePath),
    ].filter((key): key is string => Boolean(key));

    await Promise.all(keys.map((key) => this.uploads.removeByKey(key)));
    return { deleted: true };
  }

  async replaceExamImage(examId: string, file: Express.Multer.File) {
    return this.replaceImage(examId, 'examImagePath', file);
  }

  async replaceAnswerImage(examId: string, file: Express.Multer.File) {
    return this.replaceImage(examId, 'answerImagePath', file);
  }

  async downloadSubmissionPdf(examId: string, submissionId: string) {
    const submission = await this.prisma.examSubmission.findFirst({
      where: { id: submissionId, examId },
    });
    if (!submission) {
      throw new NotFoundException('پاسخ هنرجو یافت نشد.');
    }
    return this.streamPrivatePdf(submission.fileKey, submission.originalName);
  }

  duePassed(dueAt: Date | null) {
    return Boolean(dueAt && dueAt.getTime() <= Date.now());
  }

  canSubmit(exam: { status: ExamStatus; dueAt: Date | null; examImagePath: string }) {
    return (
      exam.status === ExamStatus.PUBLISHED &&
      Boolean(exam.examImagePath) &&
      !this.duePassed(exam.dueAt)
    );
  }

  private async replaceImage(
    examId: string,
    field: 'examImagePath' | 'answerImagePath',
    file: Express.Multer.File,
  ) {
    const existing = await this.ensureExam(examId);
    const stored = await this.uploads.save('exams', file);
    if (!IMAGE_PATH_RE.test(stored.path)) {
      await this.uploads.remove(stored.path);
      throw new BadRequestException('آپلود تصویر انجام نشد.');
    }

    try {
      const exam = await this.prisma.exam.update({
        where: { id: examId },
        data: { [field]: stored.path },
        include: { _count: { select: { submissions: true } } },
      });
      const previous = existing[field];
      if (previous && previous !== stored.path) {
        await this.uploads.remove(previous);
      }
      return this.mapAdminExam(exam);
    } catch (error) {
      await this.uploads.remove(stored.path);
      throw error;
    }
  }

  private async streamPrivatePdf(fileKey: string, downloadName: string) {
    const file = await this.uploads.resolvePrivate(fileKey);
    if (!file) {
      throw new NotFoundException('فایل پاسخ یافت نشد.');
    }
    return new StreamableFile(file.data, {
      type: file.mimeType,
      length: file.data.length,
      disposition: pdfContentDisposition(sanitizeOriginalName(downloadName)),
    });
  }

  private assertStudentCanSubmit(exam: {
    status: ExamStatus;
    dueAt: Date | null;
    examImagePath: string;
  }) {
    if (exam.status === ExamStatus.CLOSED) {
      throw new ForbiddenException('مهلت ارسال این آزمون به پایان رسیده است.');
    }
    if (exam.status !== ExamStatus.PUBLISHED || !exam.examImagePath) {
      throw new NotFoundException('آزمون یافت نشد.');
    }
    if (this.duePassed(exam.dueAt)) {
      throw new ForbiddenException('مهلت ارسال این آزمون به پایان رسیده است.');
    }
  }

  private assertPublishable(
    status: ExamStatus,
    examImagePath: string,
    answerImagePath: string,
  ) {
    if (status === ExamStatus.DRAFT) return;
    if (!examImagePath || !answerImagePath) {
      throw new BadRequestException(
        'برای انتشار آزمون، عکس برگه و پاسخ‌نامه را آپلود کنید.',
      );
    }
  }

  private async ensureExam(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('آزمون یافت نشد.');
    return exam;
  }

  private mapStudentSubmission(row: {
    id: string;
    submittedAt: Date;
    originalName: string;
    size: number;
  }) {
    return {
      id: row.id,
      submittedAt: row.submittedAt.toISOString(),
      originalName: row.originalName,
      size: row.size,
    };
  }

  private mapStudentExam(
    exam: {
      id: string;
      title: string;
      description: string;
      examImagePath: string;
      answerImagePath: string;
      status: ExamStatus;
      dueAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    submission: {
      id: string;
      submittedAt: Date;
      originalName: string;
      size: number;
    } | null,
    includeImages = false,
  ) {
    const answersVisible =
      Boolean(submission) || exam.status === ExamStatus.CLOSED;
    const canSubmit = this.canSubmit(exam);
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      dueAt: exam.dueAt?.toISOString() ?? null,
      duePassed: this.duePassed(exam.dueAt),
      canSubmit,
      submitted: Boolean(submission),
      answersVisible,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
      examImagePath: exam.examImagePath || null,
      answerImagePath:
        includeImages && answersVisible
          ? exam.answerImagePath || null
          : null,
      submission: submission ? this.mapStudentSubmission(submission) : null,
    };
  }

  private mapAdminExam(exam: {
    id: string;
    title: string;
    description: string;
    examImagePath: string;
    answerImagePath: string;
    status: ExamStatus;
    dueAt: Date | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { submissions: number };
  }) {
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      examImagePath: exam.examImagePath || null,
      answerImagePath: exam.answerImagePath || null,
      status: exam.status,
      dueAt: exam.dueAt?.toISOString() ?? null,
      sortOrder: exam.sortOrder,
      submissionsCount: exam._count?.submissions ?? 0,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    };
  }
}
