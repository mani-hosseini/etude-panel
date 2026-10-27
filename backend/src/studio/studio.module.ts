import { Module } from '@nestjs/common';
import { StudentPracticeController } from './student-practice.controller';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';

@Module({
  controllers: [StudioController, StudentPracticeController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
