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
import { imageMulterOptions } from '../uploads/image-upload';
import { ExamsService } from './exams.service';
import { AdminListExamsQueryDto, UpsertExamDto } from './dto/exams.dto';

const EXAM_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

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

  @Post(':id/exam-image')
  @ApiOperation({ summary: 'آپلود عکس برگه آزمون' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', imageMulterOptions(EXAM_IMAGE_MAX_BYTES)),
  )
  uploadExamImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است.');
    }
    return this.exams.replaceExamImage(id, file);
  }

  @Post(':id/answer-image')
  @ApiOperation({ summary: 'آپلود عکس پاسخ‌نامه' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', imageMulterOptions(EXAM_IMAGE_MAX_BYTES)),
  )
  uploadAnswerImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایل تصویر ارسال نشده است.');
    }
    return this.exams.replaceAnswerImage(id, file);
  }

  @Get(':id/submissions/:submissionId/file')
  @ApiOperation({ summary: 'دانلود PDF پاسخ هنرجو' })
  downloadSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.exams.downloadSubmissionPdf(id, submissionId);
  }
}
