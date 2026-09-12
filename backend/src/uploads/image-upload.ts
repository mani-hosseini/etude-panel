import { memoryStorage } from 'multer';

export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const IMAGE_ALLOWED_MIME = new Set(Object.keys(IMAGE_MIME_EXT));

export type UploadKind =
  | 'attachments'
  | 'slides'
  | 'avatars'
  | 'exams'
  | 'exercises';

export function imageMulterOptions(maxBytes: number) {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      cb: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!IMAGE_ALLOWED_MIME.has(file.mimetype)) {
        cb(new Error('فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.'), false);
        return;
      }
      cb(null, true);
    },
  };
}
