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
import { Roles } from '../common/decorators/auth.decorators';
import { imageMulterOptions } from '../uploads/image-upload';
import { UploadsService } from '../uploads/uploads.service';

const SLIDE_MAX_BYTES = 5 * 1024 * 1024;

@ApiTags('Admin Uploads')
@ApiBearerAuth()
@Controller('admin/uploads')
@Roles(Role.ADMIN)
export class AdminUploadsController {
  constructor(private readonly uploads: UploadsService) {}

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
  @UseInterceptors(FileInterceptor('file', imageMulterOptions(SLIDE_MAX_BYTES)))
  async uploadSlideImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است.');
    }
    return this.uploads.save('slides', file);
  }
}
