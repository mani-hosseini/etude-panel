import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import {
  EnrollCourseDto,
  ListUsersQueryDto,
  ResetPasswordDto,
  UpdateEnrollmentDaysDto,
  UpdateUserDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'لیست کاربران ثبت‌نام‌شده (ادمین)' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'آمار کاربران' })
  stats() {
    return this.usersService.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک کاربر + دوره‌ها و دستاوردها' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش کاربر' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ریست رمز عبور کاربر توسط ادمین' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'غیرفعال کردن کاربر' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'فعال کردن کاربر' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.activate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف هنرجو یا استاد' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.delete(id);
  }

  @Post(':id/enrollments')
  @ApiOperation({ summary: 'ثبت کاربر در یک دوره' })
  enroll(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnrollCourseDto,
  ) {
    return this.usersService.enroll(id, dto);
  }

  @Patch(':id/enrollments/:courseId')
  @ApiOperation({ summary: 'روزهای کلاس هنرجو در این دوره' })
  updateEnrollmentDays(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateEnrollmentDaysDto,
  ) {
    return this.usersService.updateEnrollmentDays(id, courseId, dto);
  }

  @Delete(':id/enrollments/:courseId')
  @ApiOperation({ summary: 'حذف ثبت‌نام کاربر از یک دوره' })
  unenroll(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId') courseId: string,
  ) {
    return this.usersService.unenroll(id, courseId);
  }

  @Post(':id/taught-courses')
  @ApiOperation({ summary: 'واگذاری دوره به استاد' })
  assignTaughtCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EnrollCourseDto,
  ) {
    return this.usersService.assignTaughtCourse(id, dto);
  }

  @Delete(':id/taught-courses/:courseId')
  @ApiOperation({ summary: 'حذف دوره از تدریس استاد' })
  unassignTaughtCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId') courseId: string,
  ) {
    return this.usersService.unassignTaughtCourse(id, courseId);
  }
}
