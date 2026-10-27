import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import {
  CreatePracticeLogDto,
  PracticeSeriesQueryDto,
  UpdateAssignmentProgressDto,
} from './dto/studio.dto';
import { StudioService } from './studio.service';

@ApiTags('Student practice')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller()
export class StudentPracticeController {
  constructor(private readonly studio: StudioService) {}

  @Get('assignments')
  @ApiOperation({ summary: 'تمرین‌های جاری هنرجو' })
  assignments(@CurrentUser() user: AuthUser) {
    return this.studio.studentAssignments(user.id);
  }

  @Patch('assignments/:id/progress')
  @ApiOperation({ summary: 'ثبت پیشرفت تمرین توسط هنرجو' })
  updateProgress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentProgressDto,
  ) {
    return this.studio.updateTargetProgress(user.id, id, dto, false);
  }

  @Get('practice/series')
  @ApiOperation({ summary: 'نمودار دقایق تمرین' })
  series(
    @CurrentUser() user: AuthUser,
    @Query() query: PracticeSeriesQueryDto,
  ) {
    return this.studio.practiceSeries(user.id, query.range ?? '7d');
  }

  @Post('practice/log')
  @ApiOperation({ summary: 'ثبت دقایق تمرین امروز' })
  log(@CurrentUser() user: AuthUser, @Body() dto: CreatePracticeLogDto) {
    return this.studio.logPractice(user.id, dto);
  }

  @Get('path')
  @ApiOperation({ summary: 'پیشرفت مسیر ۱۰ سطح' })
  path(@CurrentUser() user: AuthUser) {
    return this.studio.pathProgress(user.id);
  }
}
