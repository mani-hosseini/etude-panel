import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { IMAGE_ALLOWED_MIME } from '../uploads/image-upload';
import { PDF_MIME } from '../uploads/pdf-upload';

export const EXERCISE_MAX_BYTES = 10 * 1024 * 1024;

export const exerciseMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: EXERCISE_MAX_BYTES },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string; originalname?: string },
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    const name = file.originalname?.toLowerCase() ?? '';
    const isImage = IMAGE_ALLOWED_MIME.has(file.mimetype);
    const isPdf = file.mimetype === PDF_MIME || name.endsWith('.pdf');
    if (!isImage && !isPdf) {
      cb(
        new BadRequestException(
          'فقط تصویر (JPG، PNG، WEBP، GIF) یا فایل PDF مجاز است.',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};
