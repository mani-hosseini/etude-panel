import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { pdfMulterOptions } from '../uploads/pdf-upload';
import { ExamsService } from './exams.service';

@ApiTags('Exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست آزمون‌های منتشرشده برای هنرجو' })
  list(@CurrentUser() user: AuthUser) {
    return this.exams.listForStudent(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک آزمون برای هنرجو' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exams.getForStudent(user.id, id);
  }

  @Post(':id/submission')
  @ApiOperation({ summary: 'ارسال یا جایگزینی PDF پاسخ آزمون' })
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
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions()))
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایل PDF ارسال نشده است.');
    }
    return this.exams.submitPdf(user.id, id, file);
  }

  @Get(':id/submission/file')
  @ApiOperation({ summary: 'دانلود PDF ارسالی خود هنرجو' })
  downloadOwn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exams.downloadOwnPdf(user.id, id);
  }
}
