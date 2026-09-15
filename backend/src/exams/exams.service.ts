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
import type { PrivatePdfKind } from '../uploads/pdf-upload';
import {
  decodeMulterFilename,
  isGeneratedStorageName,
  nameFromUpload,
  sanitizeOriginalName,
} from '../uploads/original-filename';
import {
  AdminListExamsQueryDto,
  UpsertExamDto,
  UpsertExamGradeDto,
} from './dto/exams.dto';

export { sanitizeOriginalName } from '../uploads/original-filename';

type PaperField = 'exam' | 'answer';

const STUDENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  studentCode: true,
} as const;

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
        grades: {
          where: { userId },
          select: { score: true, gradedAt: true },
        },
      },
    });

    return {
      exams: exams.map((exam) => {
        const submission = exam.submissions[0] ?? null;
        const grade = exam.grades[0] ?? null;
        return this.mapStudentExam(exam, submission, grade);
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
        grades: {
          where: { userId },
          select: { score: true, gradedAt: true },
        },
      },
    });
    if (!exam || exam.status === ExamStatus.DRAFT) {
      throw new NotFoundException('آزمون یافت نشد.');
    }
    const submission = exam.submissions[0] ?? null;
    const grade = exam.grades[0] ?? null;
    return this.mapStudentExam(exam, submission, grade);
  }

  async submitPdf(
    userId: string,
    examId: string,
    file: Express.Multer.File,
    originalNameHint?: string,
  ) {
    const exam = await this.ensureExam(examId);
    this.assertStudentCanSubmit(exam);

    const stored = await this.uploads.savePdf(file, 'exam-submissions');
    const originalName = nameFromUpload(
      file,
      originalNameHint,
      'پاسخ-آزمون.pdf',
    );

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

  async downloadExamPdfForStudent(_userId: string, examId: string) {
    const exam = await this.ensureVisibleExam(examId);
    if (!exam.examFileKey) {
      throw new NotFoundException('برگه آزمون یافت نشد.');
    }
    return this.streamPrivatePdf(
      exam.examFileKey,
      exam.examOriginalName || 'exam.pdf',
    );
  }

  async downloadAnswerPdfForStudent(_userId: string, examId: string) {
    const exam = await this.ensureVisibleExam(examId);
    if (!exam.answerFileKey) {
      throw new NotFoundException('پاسخ‌نامه یافت نشد.');
    }
    return this.streamPrivatePdf(
      exam.answerFileKey,
      exam.answerOriginalName || 'answer-sheet.pdf',
    );
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
          include: { user: { select: STUDENT_SELECT } },
        },
        grades: true,
      },
    });
    if (!exam) throw new NotFoundException('آزمون یافت نشد.');

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: STUDENT_SELECT,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const submissionByUser = new Map(
      exam.submissions.map((row) => [row.userId, row]),
    );
    const gradeByUser = new Map(exam.grades.map((row) => [row.userId, row]));

    const roster = students.map((student) => {
      const submission = submissionByUser.get(student.id) ?? null;
      const grade = gradeByUser.get(student.id) ?? null;
      return {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          displayName: student.displayName,
          studentCode: student.studentCode,
        },
        submitted: Boolean(submission),
        submission: submission ? this.mapAdminSubmission(submission) : null,
        score: this.mapScore(grade?.score),
        gradedAt: grade?.gradedAt ? grade.gradedAt.toISOString() : null,
      };
    });

    return {
      ...this.mapAdminExam(exam),
      submissions: exam.submissions.map((row) => this.mapAdminSubmission(row)),
      roster,
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
      existing.examFileKey,
      existing.answerFileKey,
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
      exam.examFileKey,
      exam.answerFileKey,
    ].filter(Boolean);

    await Promise.all(keys.map((key) => this.uploads.removeByKey(key)));
    return { deleted: true };
  }

  async replaceExamPdf(
    examId: string,
    file: Express.Multer.File,
    originalNameHint?: string,
  ) {
    return this.replacePaper(examId, 'exam', file, originalNameHint);
  }

  async replaceAnswerPdf(
    examId: string,
    file: Express.Multer.File,
    originalNameHint?: string,
  ) {
    return this.replacePaper(examId, 'answer', file, originalNameHint);
  }

  async downloadExamPdfForAdmin(examId: string) {
    const exam = await this.ensureExam(examId);
    if (!exam.examFileKey) {
      throw new NotFoundException('برگه آزمون یافت نشد.');
    }
    return this.streamPrivatePdf(
      exam.examFileKey,
      exam.examOriginalName || 'exam.pdf',
    );
  }

  async downloadAnswerPdfForAdmin(examId: string) {
    const exam = await this.ensureExam(examId);
    if (!exam.answerFileKey) {
      throw new NotFoundException('پاسخ‌نامه یافت نشد.');
    }
    return this.streamPrivatePdf(
      exam.answerFileKey,
      exam.answerOriginalName || 'answer-key.pdf',
    );
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

  async upsertGrade(examId: string, dto: UpsertExamGradeDto) {
    await this.ensureExam(examId);
    const student = await this.prisma.user.findFirst({
      where: { id: dto.userId, role: 'STUDENT' },
      select: STUDENT_SELECT,
    });
    if (!student) {
      throw new NotFoundException('هنرجو یافت نشد.');
    }

    if (dto.score === null) {
      await this.prisma.examGrade.deleteMany({
        where: { examId, userId: dto.userId },
      });
      return {
        examId,
        userId: dto.userId,
        score: null,
        gradedAt: null,
        student,
      };
    }

    const grade = await this.prisma.examGrade.upsert({
      where: { examId_userId: { examId, userId: dto.userId } },
      create: {
        examId,
        userId: dto.userId,
        score: dto.score,
        gradedAt: new Date(),
      },
      update: {
        score: dto.score,
        gradedAt: new Date(),
      },
    });

    return {
      examId,
      userId: dto.userId,
      score: this.mapScore(grade.score),
      gradedAt: grade.gradedAt.toISOString(),
      student,
    };
  }

  canSubmit(exam: { status: ExamStatus; examFileKey: string }) {
    return exam.status === ExamStatus.PUBLISHED && Boolean(exam.examFileKey);
  }

  private async replacePaper(
    examId: string,
    field: PaperField,
    file: Express.Multer.File,
    originalNameHint?: string,
  ) {
    const existing = await this.ensureExam(examId);
    const kind: PrivatePdfKind =
      field === 'exam' ? 'exam-papers' : 'exam-answers';
    const stored = await this.uploads.savePdf(file, kind);
    const originalName = nameFromUpload(
      file,
      originalNameHint,
      field === 'exam' ? 'برگه-آزمون.pdf' : 'پاسخ-نامه.pdf',
    );

    const data =
      field === 'exam'
        ? {
            examFileKey: stored.key,
            examOriginalName: originalName,
            examSize: stored.size,
          }
        : {
            answerFileKey: stored.key,
            answerOriginalName: originalName,
            answerSize: stored.size,
          };
    const previousKey =
      field === 'exam' ? existing.examFileKey : existing.answerFileKey;

    try {
      const exam = await this.prisma.exam.update({
        where: { id: examId },
        data,
        include: { _count: { select: { submissions: true } } },
      });
      if (previousKey && previousKey !== stored.key) {
        await this.uploads.removeByKey(previousKey);
      }
      return this.mapAdminExam(exam);
    } catch (error) {
      await this.uploads.removeByKey(stored.key);
      throw error;
    }
  }

  private async streamPrivatePdf(fileKey: string, downloadName: string) {
    const file = await this.uploads.resolvePrivate(fileKey);
    if (!file) {
      throw new NotFoundException('فایل PDF یافت نشد.');
    }
    return new StreamableFile(file.data, {
      type: file.mimeType,
      length: file.data.length,
      disposition: pdfContentDisposition(sanitizeOriginalName(downloadName)),
    });
  }

  private assertStudentCanSubmit(exam: {
    status: ExamStatus;
    examFileKey: string;
  }) {
    if (exam.status === ExamStatus.CLOSED) {
      throw new ForbiddenException('این آزمون بسته شده است.');
    }
    if (exam.status !== ExamStatus.PUBLISHED || !exam.examFileKey) {
      throw new NotFoundException('آزمون یافت نشد.');
    }
  }

  private assertPublishable(
    status: ExamStatus,
    examFileKey: string,
    answerFileKey: string,
  ) {
    if (status === ExamStatus.DRAFT) return;
    if (!examFileKey && !answerFileKey) {
      throw new BadRequestException(
        'برای انتشار آزمون، حداقل یکی از فایل‌های PDF را آپلود کنید.',
      );
    }
  }

  private async ensureVisibleExam(id: string) {
    const exam = await this.ensureExam(id);
    if (exam.status === ExamStatus.DRAFT) {
      throw new NotFoundException('آزمون یافت نشد.');
    }
    return exam;
  }

  private async ensureExam(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('آزمون یافت نشد.');
    return exam;
  }

  private displayPaperName(name: string, fallback: string): string {
    const decoded = decodeMulterFilename(name);
    if (!decoded?.trim() || isGeneratedStorageName(decoded)) return fallback;
    return decoded;
  }

  private mapScore(
    score: Prisma.Decimal | number | string | null | undefined,
  ): number | null {
    if (score == null || score === '') return null;
    const value = Number(score);
    return Number.isFinite(value) ? value : null;
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
      originalName: this.displayPaperName(row.originalName, 'پاسخ-آزمون.pdf'),
      size: row.size,
    };
  }

  private mapAdminSubmission(row: {
    id: string;
    examId: string;
    submittedAt: Date;
    updatedAt: Date;
    originalName: string;
    filename: string;
    mimeType: string;
    size: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      displayName: string;
      studentCode: string | null;
    };
  }) {
    return {
      id: row.id,
      examId: row.examId,
      submittedAt: row.submittedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      originalName: this.displayPaperName(row.originalName, 'پاسخ-آزمون.pdf'),
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
    };
  }

  private mapStudentExam(
    exam: {
      id: string;
      title: string;
      description: string;
      examFileKey: string;
      examOriginalName: string;
      examSize: number;
      answerFileKey: string;
      answerOriginalName: string;
      answerSize: number;
      status: ExamStatus;
      createdAt: Date;
      updatedAt: Date;
    },
    submission: {
      id: string;
      submittedAt: Date;
      originalName: string;
      size: number;
    } | null,
    grade: {
      score: Prisma.Decimal | number | string | null;
      gradedAt: Date | null;
    } | null,
  ) {
    const answersVisible = Boolean(exam.answerFileKey);
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      canSubmit: this.canSubmit(exam),
      submitted: Boolean(submission),
      answersVisible,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
      hasExamFile: Boolean(exam.examFileKey),
      examFileName: exam.examFileKey
        ? this.displayPaperName(exam.examOriginalName, 'برگه-آزمون.pdf')
        : null,
      examFileSize: exam.examSize || null,
      hasAnswerFile: answersVisible,
      answerFileName: answersVisible
        ? this.displayPaperName(exam.answerOriginalName, 'پاسخ-نامه.pdf')
        : null,
      answerFileSize: answersVisible ? exam.answerSize || null : null,
      score: this.mapScore(grade?.score),
      gradedAt: grade?.gradedAt ? grade.gradedAt.toISOString() : null,
      submission: submission ? this.mapStudentSubmission(submission) : null,
    };
  }

  private mapAdminExam(exam: {
    id: string;
    title: string;
    description: string;
    examFileKey: string;
    examOriginalName: string;
    examSize: number;
    answerFileKey: string;
    answerOriginalName: string;
    answerSize: number;
    status: ExamStatus;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { submissions: number };
  }) {
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      hasExamFile: Boolean(exam.examFileKey),
      examFileName: exam.examFileKey
        ? this.displayPaperName(exam.examOriginalName, 'برگه-آزمون.pdf')
        : null,
      examFileSize: exam.examSize || null,
      hasAnswerFile: Boolean(exam.answerFileKey),
      answerFileName: exam.answerFileKey
        ? this.displayPaperName(exam.answerOriginalName, 'پاسخ-نامه.pdf')
        : null,
      answerFileSize: exam.answerSize || null,
      status: exam.status,
      sortOrder: exam.sortOrder,
      submissionsCount: exam._count?.submissions ?? 0,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    };
  }
}
