import { Module } from '@nestjs/common';
import { AdminExamsController } from './admin-exams.controller';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  controllers: [ExamsController, AdminExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
