import {
  BadRequestException,
  Body,
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
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { pdfMulterOptions } from '../uploads/pdf-upload';
import { UploadOriginalNameDto } from './dto/exams.dto';
import { ExamsService } from './exams.service';

@ApiTags('Exams')
@ApiBearerAuth()
@Roles(Role.STUDENT)
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

  @Get(':id/file')
  @ApiOperation({ summary: 'دانلود PDF برگه آزمون' })
  downloadExamFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exams.downloadExamPdfForStudent(user.id, id);
  }

  @Get(':id/answer-file')
  @ApiOperation({ summary: 'دانلود PDF پاسخ‌نامه برای پرینت' })
  downloadAnswerFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exams.downloadAnswerPdfForStudent(user.id, id);
  }

  @Post(':id/submission')
  @ApiOperation({ summary: 'ارسال یا جایگزینی PDF پاسخ آزمون' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        originalName: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions()))
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: UploadOriginalNameDto,
  ) {
    if (!file) {
      throw new BadRequestException('فایل PDF ارسال نشده است.');
    }
    return this.exams.submitPdf(user.id, id, file, body?.originalName);
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
