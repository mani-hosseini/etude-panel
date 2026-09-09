import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

export const PDF_MIME = 'application/pdf';
export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_MAGIC = Buffer.from('%PDF');

export type PrivatePdfKind =
  | 'exam-submissions'
  | 'exam-papers'
  | 'exam-answers';

export const PRIVATE_PDF_PREFIX: Record<PrivatePdfKind, string> = {
  'exam-submissions': 'submission',
  'exam-papers': 'exam',
  'exam-answers': 'answer',
};

export function pdfMulterOptions(maxBytes = PDF_MAX_BYTES) {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (
      _req: unknown,
      file: { mimetype: string; originalname?: string },
      cb: (error: Error | null, accept: boolean) => void,
    ) => {
      const name = file.originalname?.toLowerCase() ?? '';
      const mimeOk = file.mimetype === PDF_MIME;
      const extOk = name.endsWith('.pdf');
      if (!mimeOk && !extOk) {
        cb(new BadRequestException('فقط فایل PDF مجاز است.'), false);
        return;
      }
      cb(null, true);
    },
  };
}

export function assertPdfBuffer(file: {
  buffer?: Buffer;
  mimetype: string;
  size: number;
}) {
  if (!file.size || file.size > PDF_MAX_BYTES) {
    throw new BadRequestException('حجم فایل حداکثر ۱۰ مگابایت باشد.');
  }
  const buffer = file.buffer;
  if (!buffer || buffer.length < 5) {
    throw new BadRequestException('فایل PDF نامعتبر است.');
  }
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    throw new BadRequestException('فایل PDF نامعتبر است.');
  }
}
