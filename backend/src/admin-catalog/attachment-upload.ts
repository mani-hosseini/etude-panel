import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';

export const ATTACHMENT_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const ATTACHMENT_UPLOAD_DIR = join(
  process.cwd(),
  'uploads',
  'attachments',
);

export function ensureAttachmentUploadDir() {
  if (!existsSync(ATTACHMENT_UPLOAD_DIR)) {
    mkdirSync(ATTACHMENT_UPLOAD_DIR, { recursive: true });
  }
}

export const attachmentMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureAttachmentUploadDir();
      cb(null, ATTACHMENT_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const safeExt = extname(file.originalname).toLowerCase() || '.png';
      const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const ext = allowedExt.includes(safeExt) ? safeExt : '.png';
      const name = `attach-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: ATTACHMENT_MAX_BYTES },
  fileFilter: (_req: unknown, file: { mimetype: string }, cb: (error: Error | null, accept: boolean) => void) => {
    if (!ATTACHMENT_ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.'), false);
      return;
    }
    cb(null, true);
  },
};
