import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { LessonLogQueryDto } from './dto/lesson-log.dto';
import { LessonLogService } from './lesson-log.service';

@ApiTags('Admin Lesson Log')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/lesson-log')
export class LessonLogController {
  constructor(private readonly logs: LessonLogService) {}

  @Get()
  @ApiOperation({ summary: 'لاگ درس‌هایی که استادها برای هنرجوها ثبت کرده‌اند' })
  list(@Query() query: LessonLogQueryDto) {
    return this.logs.list(query);
  }
}
