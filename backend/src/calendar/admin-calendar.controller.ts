import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { CalendarService } from './calendar.service';
import { ImportCalendarYearDto, UpsertOccasionDto } from './dto/calendar.dto';

@ApiTags('Admin Calendar')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/calendar')
export class AdminCalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('occasions')
  @ApiOperation({ summary: 'مناسبت‌های یک سال شمسی' })
  list(@Query('year', ParseIntPipe) year: number) {
    return this.calendar.listOccasions(year);
  }

  @Post('occasions')
  @ApiOperation({ summary: 'ثبت تعطیلی یا مناسبت موردی' })
  create(@Body() dto: UpsertOccasionDto) {
    return this.calendar.createOccasion(dto);
  }

  @Patch('occasions/:id')
  @ApiOperation({ summary: 'ویرایش مناسبت' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertOccasionDto,
  ) {
    return this.calendar.updateOccasion(id, dto);
  }

  @Delete('occasions/:id')
  @ApiOperation({ summary: 'حذف مناسبت' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.calendar.deleteOccasion(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'ورود مناسبت‌های رسمی یک سال' })
  importYear(@Body() dto: ImportCalendarYearDto) {
    return this.calendar.importYear(dto);
  }
}
