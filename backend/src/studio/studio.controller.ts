import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import {
  CreateAssignmentDto,
  MarkTodayAttendanceDto,
  SaveScoresDto,
  SaveSessionWorkDto,
  UpdateAssignmentProgressDto,
  UpdateStudentLevelDto,
  UpdateStudentStarsDto,
  UpdateTeacherProfileDto,
  UpsertAttendanceDto,
} from './dto/studio.dto';
import { StudioService } from './studio.service';

@ApiTags('Studio')
@ApiBearerAuth()
@Roles(Role.TEACHER)
@Controller('studio')
export class StudioController {
  constructor(private readonly studio: StudioService) {}

  @Get()
  @ApiOperation({ summary: 'نمای کلی استودیو استاد' })
  overview(@CurrentUser() user: AuthUser) {
    return this.studio.overview(user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'پروفایل استاد' })
  profile(@CurrentUser() user: AuthUser) {
    return this.studio.profile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'ویرایش پروفایل استاد' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTeacherProfileDto,
  ) {
    return this.studio.updateProfile(user.id, dto);
  }

  @Get('classes')
  @ApiOperation({ summary: 'دوره‌های تدریس استاد' })
  classes(@CurrentUser() user: AuthUser) {
    return this.studio.listClasses(user.id);
  }

  @Get('students')
  @ApiOperation({ summary: 'هنرجویان کلاس‌های استاد' })
  students(@CurrentUser() user: AuthUser) {
    return this.studio.listStudents(user.id);
  }

  @Get('students/:id')
  @ApiOperation({ summary: 'پرونده هنرجو برای استاد' })
  student(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studio.getStudent(user.id, id);
  }

  @Patch('students/:id/stars')
  @ApiOperation({ summary: 'ثبت ستاره طلایی هنرجو' })
  updateStars(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentStarsDto,
  ) {
    return this.studio.updateStars(user.id, id, dto);
  }

  @Patch('students/:id/level')
  @ApiOperation({ summary: 'تغییر سطح هنرجو از ۱ تا ۱۰' })
  updateLevel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentLevelDto,
  ) {
    return this.studio.updateLevel(user.id, id, dto);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'برنامه کلاس‌های استاد' })
  schedule(@CurrentUser() user: AuthUser) {
    return this.studio.schedule(user.id);
  }

  @Get('today')
  @ApiOperation({ summary: 'رول کلاس امروز' })
  today(@CurrentUser() user: AuthUser) {
    return this.studio.todayRoster(user.id);
  }

  @Put('today/attendance')
  @ApiOperation({ summary: 'ثبت تشکیل کلاس برای هنرجویان امروز' })
  markTodayAttendance(
    @CurrentUser() user: AuthUser,
    @Body() dto: MarkTodayAttendanceDto,
  ) {
    return this.studio.markTodayAttendance(user.id, dto);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'تمرین‌های ثبت‌شده استاد' })
  assignments(@CurrentUser() user: AuthUser) {
    return this.studio.listAssignments(user.id);
  }

  @Post('assignments')
  @ApiOperation({ summary: 'ثبت تمرین برای هنرجو یا کلاس' })
  createAssignment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.studio.createAssignment(user.id, dto);
  }

  @Delete('assignments/:id')
  @ApiOperation({ summary: 'حذف تمرین' })
  deleteAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studio.deleteAssignment(user.id, id);
  }

  @Patch('assignments/:id/progress')
  @ApiOperation({ summary: 'به‌روز کردن پیشرفت یک مخاطب تمرین' })
  updateProgress(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentProgressDto,
  ) {
    return this.studio.updateTargetProgress(user.id, id, dto, true);
  }

  @Patch('scores')
  @ApiOperation({ summary: 'ثبت نهایی نمره‌های اجرا از ۰ تا ۱۰۰' })
  saveScores(@CurrentUser() user: AuthUser, @Body() dto: SaveScoresDto) {
    return this.studio.saveScores(user.id, dto);
  }

  @Get('meetings')
  @ApiOperation({ summary: 'جلسات حضور و غیاب' })
  meetings(@CurrentUser() user: AuthUser) {
    return this.studio.meetings(user.id);
  }

  @Put('attendance')
  @ApiOperation({ summary: 'ثبت حضور و غیاب' })
  attendance(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertAttendanceDto,
  ) {
    return this.studio.upsertAttendance(user.id, dto);
  }

  @Put('sessions/:sessionId/work')
  @ApiOperation({ summary: 'ثبت تکلیف، نکته و باز کردن جلسه' })
  saveSessionWork(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SaveSessionWorkDto,
  ) {
    return this.studio.saveSessionWork(user.id, sessionId, dto);
  }

  @Post('students/:id/sessions/:sessionId/confirm')
  @ApiOperation({ summary: 'تأیید جلسه هنرجو و باز کردن جلسه بعد' })
  confirmSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.studio.confirmSession(user.id, id, sessionId);
  }
}
