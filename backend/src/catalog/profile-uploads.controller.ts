import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import {
  BadRequestException,
  Controller,
  Delete,
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
import { diskStorage } from 'multer';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { CatalogService } from './catalog.service';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Max avatar size: 1 MB */
const MAX_AVATAR_BYTES = 1 * 1024 * 1024;

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileUploadsController {
  constructor(private readonly catalog: CatalogService) {}

  @Post('avatar')
  @ApiOperation({ summary: 'آپلود عکس پروفایل هنرجو' })
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
          const name = `avatar-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: MAX_AVATAR_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          cb(
            new Error('فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('حجم تصویر حداکثر ۱ مگابایت باشد.');
    }

    const path = `/uploads/avatars/${file.filename}`;
    const previous = await this.catalog.setAvatarUrl(user.id, path);
    if (previous?.startsWith('/uploads/avatars/')) {
      const oldPath = join(process.cwd(), previous.replace(/^\//, ''));
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          /* ignore cleanup errors */
        }
      }
    }

    return {
      path,
      avatarUrl: path,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'حذف عکس پروفایل' })
  async removeAvatar(@CurrentUser() user: AuthUser) {
    const previous = await this.catalog.setAvatarUrl(user.id, null);
    if (previous?.startsWith('/uploads/avatars/')) {
      const oldPath = join(process.cwd(), previous.replace(/^\//, ''));
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch {
          /* ignore */
        }
      }
    }
    return { deleted: true, avatarUrl: null };
  }
}
