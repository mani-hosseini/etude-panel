import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { pdfMulterOptions } from '../uploads/pdf-upload';
import { ExamsService } from './exams.service';
import {
  AdminListExamsQueryDto,
  UploadOriginalNameDto,
  UpsertExamDto,
  UpsertExamGradeDto,
} from './dto/exams.dto';

@ApiTags('Admin Exams')
@ApiBearerAuth()
@Controller('admin/exams')
@Roles(Role.ADMIN)
export class AdminExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست آزمون‌ها' })
  list(@Query() query: AdminListExamsQueryDto) {
    return this.exams.listForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات آزمون و پاسخ‌های هنرجویان' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.exams.getForAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'ایجاد آزمون' })
  create(@Body() dto: UpsertExamDto) {
    return this.exams.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش آزمون' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertExamDto,
  ) {
    return this.exams.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف آزمون و فایل‌های مرتبط' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.exams.remove(id);
  }

  @Post(':id/exam-file')
  @ApiOperation({ summary: 'آپلود PDF برگه آزمون' })
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
  uploadExamFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: UploadOriginalNameDto,
  ) {
    if (!file) {
      throw new BadRequestException('فایل PDF ارسال نشده است.');
    }
    return this.exams.replaceExamPdf(id, file, body?.originalName);
  }

  @Get(':id/exam-file')
  @ApiOperation({ summary: 'دانلود PDF برگه آزمون' })
  downloadExamFile(@Param('id', ParseUUIDPipe) id: string) {
    return this.exams.downloadExamPdfForAdmin(id);
  }

  @Post(':id/answer-file')
  @ApiOperation({ summary: 'آپلود PDF پاسخ‌نامه' })
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
  uploadAnswerFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: UploadOriginalNameDto,
  ) {
    if (!file) {
      throw new BadRequestException('فایل PDF ارسال نشده است.');
    }
    return this.exams.replaceAnswerPdf(id, file, body?.originalName);
  }

  @Get(':id/answer-file')
  @ApiOperation({ summary: 'دانلود PDF پاسخ‌نامه' })
  downloadAnswerFile(@Param('id', ParseUUIDPipe) id: string) {
    return this.exams.downloadAnswerPdfForAdmin(id);
  }

  @Get(':id/submissions/:submissionId/file')
  @ApiOperation({ summary: 'دانلود PDF پاسخ هنرجو' })
  downloadSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.exams.downloadSubmissionPdf(id, submissionId);
  }

  @Patch(':id/grades')
  @ApiOperation({ summary: 'ثبت یا ویرایش نمره هنرجو از ۱۰۰، حتی بدون ارسال PDF' })
  upsertGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertExamGradeDto,
  ) {
    return this.exams.upsertGrade(id, dto);
  }
}
