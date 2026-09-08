import { ExamStatus } from '@prisma/client';
import { ExamsService, sanitizeOriginalName } from './exams.service';

const NOW = new Date('2026-09-07T12:00:00.000Z');

function examRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-1',
    title: 'آزمون ریتم',
    description: 'برگه را حل کنید',
    examImagePath: '/uploads/exams/exam-1.png',
    answerImagePath: '/uploads/exams/answer-1.png',
    status: ExamStatus.PUBLISHED,
    dueAt: new Date('2026-12-01T12:00:00.000Z'),
    sortOrder: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('sanitizeOriginalName', () => {
  it('keeps a safe pdf name and strips path characters', () => {
    expect(sanitizeOriginalName('پاسخ من.pdf')).toBe('پاسخ من.pdf');
    expect(sanitizeOriginalName('../etc/passwd.pdf')).toBe('.._etc_passwd.pdf');
    expect(sanitizeOriginalName('notes')).toBe('notes.pdf');
  });
});

describe('ExamsService', () => {
  const prisma = {
    exam: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    examSubmission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const uploads = {
    save: jest.fn(),
    savePdf: jest.fn(),
    remove: jest.fn(),
    removeByKey: jest.fn(),
    resolvePrivate: jest.fn(),
    keyFromPublicPath: jest.fn((path: string) =>
      path.startsWith('/uploads/') ? path.slice('/uploads/'.length) : null,
    ),
  };

  const service = new ExamsService(prisma as never, uploads as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides draft exams from students', async () => {
    prisma.exam.findUnique.mockResolvedValue(
      examRow({ status: ExamStatus.DRAFT, submissions: [] }),
    );
    await expect(service.getForStudent('user-1', 'exam-1')).rejects.toThrow(
      'آزمون یافت نشد.',
    );
  });

  it('does not leak the answer sheet before submission', async () => {
    prisma.exam.findUnique.mockResolvedValue(
      examRow({ submissions: [] }),
    );
    const detail = await service.getForStudent('user-1', 'exam-1');
    expect(detail.answersVisible).toBe(false);
    expect(detail.answerImagePath).toBeNull();
    expect(detail.examImagePath).toBe('/uploads/exams/exam-1.png');
    expect(detail.canSubmit).toBe(true);
  });

  it('reveals the answer sheet after the student submits', async () => {
    prisma.exam.findUnique.mockResolvedValue(
      examRow({
        submissions: [
          {
            id: 'sub-1',
            submittedAt: NOW,
            originalName: 'mine.pdf',
            filename: 'submission-a.pdf',
            size: 1200,
          },
        ],
      }),
    );
    const detail = await service.getForStudent('user-1', 'exam-1');
    expect(detail.answersVisible).toBe(true);
    expect(detail.answerImagePath).toBe('/uploads/exams/answer-1.png');
    expect(detail.submitted).toBe(true);
  });

  it('rejects submissions after the deadline', async () => {
    prisma.exam.findUnique.mockResolvedValue(
      examRow({ dueAt: new Date('2026-01-01T00:00:00.000Z') }),
    );
    await expect(
      service.submitPdf('user-1', 'exam-1', {
        originalname: 'a.pdf',
      } as Express.Multer.File),
    ).rejects.toThrow('مهلت ارسال این آزمون به پایان رسیده است.');
    expect(uploads.savePdf).not.toHaveBeenCalled();
  });

  it('rejects publishing without both images', async () => {
    await expect(
      service.create({
        title: 'بدون عکس',
        status: ExamStatus.PUBLISHED,
      }),
    ).rejects.toThrow('برای انتشار آزمون، عکس برگه و پاسخ‌نامه را آپلود کنید.');
  });

  it('replaces a previous PDF and deletes the old private file', async () => {
    prisma.exam.findUnique.mockResolvedValue(examRow());
    uploads.savePdf.mockResolvedValue({
      key: 'exam-submissions/new.pdf',
      filename: 'new.pdf',
      mimeType: 'application/pdf',
      size: 40,
      path: '/uploads/exam-submissions/new.pdf',
    });
    prisma.examSubmission.findUnique.mockResolvedValue({
      fileKey: 'exam-submissions/old.pdf',
    });
    prisma.examSubmission.upsert.mockResolvedValue({
      id: 'sub-1',
      submittedAt: NOW,
      originalName: 'a.pdf',
      size: 40,
    });

    const result = await service.submitPdf('user-1', 'exam-1', {
      originalname: 'a.pdf',
    } as Express.Multer.File);

    expect(result.submitted).toBe(true);
    expect(uploads.removeByKey).toHaveBeenCalledWith(
      'exam-submissions/old.pdf',
    );
  });

  it('cannot submit a closed exam', async () => {
    prisma.exam.findUnique.mockResolvedValue(
      examRow({ status: ExamStatus.CLOSED }),
    );
    await expect(
      service.submitPdf('user-1', 'exam-1', {
        originalname: 'a.pdf',
      } as Express.Multer.File),
    ).rejects.toThrow('مهلت ارسال این آزمون به پایان رسیده است.');
  });
});
