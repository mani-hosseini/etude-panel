import { Module } from '@nestjs/common';
import { AdminCalendarController } from './admin-calendar.controller';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Module({
  controllers: [CalendarController, AdminCalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
