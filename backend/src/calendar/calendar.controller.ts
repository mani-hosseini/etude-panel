import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { CalendarService } from './calendar.service';
import {
  CalendarDayQueryDto,
  CalendarMonthQueryDto,
} from './dto/calendar.dto';

@ApiTags('Calendar')
@ApiBearerAuth()
@Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('now')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @ApiOperation({ summary: 'ساعت و تاریخ جاری به وقت تهران' })
  now() {
    return this.calendar.now();
  }

  @Get('day')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'وضعیت یک روز شمسی' })
  day(@Query() query: CalendarDayQueryDto) {
    return this.calendar.day(query.year, query.month, query.day);
  }

  @Get('month')
  @ApiOperation({ summary: 'تقویم ماهانه شمسی' })
  month(@Query() query: CalendarMonthQueryDto) {
    return this.calendar.month(query.year, query.month);
  }
}
