import { ExamStatus } from '@prisma/client';
import { ExamsService, sanitizeOriginalName } from './exams.service';

const NOW = new Date('2026-09-07T12:00:00.000Z');

function examRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-1',
    title: 'آزمون ریتم',
    description: 'برگه را حل کنید',
    examFileKey: 'exam-papers/exam-1.pdf',
    examOriginalName: 'exam.pdf',
    examSize: 1200,
    answerFileKey: 'exam-answers/answer-1.pdf',
    answerOriginalName: 'answers.pdf',
    answerSize: 800,
    status: ExamStatus.PUBLISHED,
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
    keyFromPublicPath: jest.fn(),
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

  it('shows the answer sheet before the student submits so they can print it', async () => {
    prisma.exam.findUnique.mockResolvedValue(examRow({ submissions: [] }));
    const detail = await service.getForStudent('user-1', 'exam-1');
    expect(detail.answersVisible).toBe(true);
    expect(detail.hasAnswerFile).toBe(true);
    expect(detail.answerFileName).toBe('answers.pdf');
    expect(detail.hasExamFile).toBe(true);
    expect(detail.canSubmit).toBe(true);
    expect(detail.submitted).toBe(false);
  });

  it('still shows the answer sheet after the student submits', async () => {
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
    expect(detail.hasAnswerFile).toBe(true);
    expect(detail.answerFileName).toBe('answers.pdf');
    expect(detail.submitted).toBe(true);
  });

  it('rejects publishing when neither PDF is uploaded', async () => {
    await expect(
      service.create({
        title: 'بدون فایل',
        status: ExamStatus.PUBLISHED,
      }),
    ).rejects.toThrow(
      'برای انتشار آزمون، حداقل یکی از فایل‌های PDF را آپلود کنید.',
    );
  });

  it('allows publishing after only the answer sheet is uploaded', async () => {
    const existing = examRow({
      examFileKey: '',
      examOriginalName: '',
      examSize: 0,
    });
    prisma.exam.findUnique.mockResolvedValue(existing);
    prisma.exam.update.mockResolvedValue({
      ...existing,
      status: ExamStatus.PUBLISHED,
      _count: { submissions: 0 },
    });

    const result = await service.update('exam-1', {
      title: 'آزمون ریتم',
      status: ExamStatus.PUBLISHED,
    });

    expect(result.status).toBe(ExamStatus.PUBLISHED);
    expect(result.hasAnswerFile).toBe(true);
    expect(result.hasExamFile).toBe(false);
  });

  it('lets students download the answer sheet before submitting', async () => {
    prisma.exam.findUnique.mockResolvedValue(examRow());
    uploads.resolvePrivate.mockResolvedValue({
      data: Buffer.from('%PDF-1.4'),
      mimeType: 'application/pdf',
    });

    await service.downloadAnswerPdfForStudent('user-1', 'exam-1');

    expect(uploads.resolvePrivate).toHaveBeenCalledWith(
      'exam-answers/answer-1.pdf',
    );
  });

  it('cannot submit until the exam paper is uploaded', async () => {
    prisma.exam.findUnique.mockResolvedValue(
      examRow({ examFileKey: '', examOriginalName: '', examSize: 0 }),
    );
    await expect(
      service.submitPdf('user-1', 'exam-1', {
        originalname: 'a.pdf',
      } as Express.Multer.File),
    ).rejects.toThrow('آزمون یافت نشد.');
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
    expect(uploads.savePdf).toHaveBeenCalledWith(
      expect.anything(),
      'exam-submissions',
    );
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
    ).rejects.toThrow('این آزمون بسته شده است.');
  });
});
