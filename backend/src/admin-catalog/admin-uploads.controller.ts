import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { Roles } from '../common/decorators/auth.decorators';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'slides');

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

@ApiTags('Admin Uploads')
@ApiBearerAuth()
@Controller('admin/uploads')
@Roles(Role.ADMIN)
export class AdminUploadsController {
  @Post('slide-image')
  @ApiOperation({ summary: 'آپلود تصویر اسلاید' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir();
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname).toLowerCase() || '.png';
          const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
          const ext = allowedExt.includes(safeExt) ? safeExt : '.png';
          const name = `slide-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(new Error('فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadSlideImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است.');
    }
    const path = `/uploads/slides/${file.filename}`;
    return {
      path,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
