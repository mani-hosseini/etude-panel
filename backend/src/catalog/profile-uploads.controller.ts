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
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { CatalogService } from './catalog.service';
import { imageMulterOptions } from '../uploads/image-upload';
import { UploadsService } from '../uploads/uploads.service';

const MAX_AVATAR_BYTES = 1 * 1024 * 1024;

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileUploadsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly uploads: UploadsService,
  ) {}

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
  @UseInterceptors(FileInterceptor('file', imageMulterOptions(MAX_AVATAR_BYTES)))
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

    const stored = await this.uploads.save('avatars', file);
    const previous = await this.catalog.setAvatarUrl(user.id, stored.path);
    if (previous) await this.uploads.remove(previous);

    return {
      path: stored.path,
      avatarUrl: stored.path,
      filename: stored.filename,
      mimeType: stored.mimeType,
      size: stored.size,
    };
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'حذف عکس پروفایل' })
  async removeAvatar(@CurrentUser() user: AuthUser) {
    const previous = await this.catalog.setAvatarUrl(user.id, null);
    if (previous) await this.uploads.remove(previous);
    return { deleted: true, avatarUrl: null };
  }
}
