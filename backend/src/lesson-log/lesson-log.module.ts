import { Module } from '@nestjs/common';
import { LessonLogController } from './lesson-log.controller';
import { LessonLogService } from './lesson-log.service';

@Module({
  controllers: [LessonLogController],
  providers: [LessonLogService],
})
export class LessonLogModule {}
