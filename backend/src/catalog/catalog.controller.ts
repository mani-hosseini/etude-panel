import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { CatalogService } from './catalog.service';
import {
  CourseScopedQueryDto,
  SessionsQueryDto,
} from './dto/catalog-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSessionProgressDto } from './dto/update-session-progress.dto';

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'پیشخوان چنددوره‌ای هنرجو' })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.catalog.getDashboard(user.id);
  }

  @Get('courses')
  @ApiOperation({ summary: 'فهرست دوره‌های هنرجو' })
  listCourses(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.catalog.listCourses(user.id, query);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'جزئیات یک دوره' })
  getCourse(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalog.getCourse(user.id, id);
  }

  @Get('courses/:id/certificate')
  @ApiOperation({ summary: 'وضعیت گواهی یک دوره' })
  getCourseCertificate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.catalog.getCertificate(user.id, id);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'فهرست جلسات (با courseId اختیاری)' })
  listSessions(
    @CurrentUser() user: AuthUser,
    @Query() query: SessionsQueryDto,
  ) {
    return this.catalog.listSessions(user.id, query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'جزئیات جلسه' })
  @ApiQuery({ name: 'courseId', required: false })
  getSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: CourseScopedQueryDto,
  ) {
    return this.catalog.getSession(user.id, id, query.courseId);
  }

  @Get('sessions/:id/slides')
  @ApiOperation({ summary: 'اسلایدهای جلسه' })
  @ApiQuery({ name: 'courseId', required: false })
  getSlides(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: CourseScopedQueryDto,
  ) {
    return this.catalog.getSessionSlides(user.id, id, query.courseId);
  }

  @Get('sessions/:id/attachments')
  @ApiOperation({ summary: 'فایل‌ها و عکس‌های پیوست جلسه' })
  @ApiQuery({ name: 'courseId', required: false })
  getAttachments(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: CourseScopedQueryDto,
  ) {
    return this.catalog.getSessionAttachments(user.id, id, query.courseId);
  }

  @Get('sessions/:id/progress')
  @ApiOperation({ summary: 'پیشرفت اسلایدهای جلسه' })
  @ApiQuery({ name: 'courseId', required: false })
  getProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: CourseScopedQueryDto,
  ) {
    return this.catalog.getSessionProgress(user.id, id, query.courseId);
  }

  @Patch('sessions/:id/progress')
  @ApiOperation({ summary: 'ثبت پیشرفت اسلایدهای جلسه' })
  @ApiQuery({ name: 'courseId', required: false })
  updateProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: CourseScopedQueryDto,
    @Body() dto: UpdateSessionProgressDto,
  ) {
    return this.catalog.updateSessionProgress(
      user.id,
      id,
      dto.lastSlideIndex,
      query.courseId,
    );
  }

  @Get('schedule')
  @ApiOperation({ summary: 'برنامه کلاس‌ها' })
  @ApiQuery({ name: 'courseId', required: false })
  getSchedule(
    @CurrentUser() user: AuthUser,
    @Query() query: CourseScopedQueryDto,
  ) {
    return this.catalog.getSchedule(user.id, query.courseId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'پروفایل هنرجو و دوره‌ها' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.catalog.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'ویرایش پروفایل هنرجو' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.catalog.updateProfile(user.id, dto);
  }

  @Get('masterclass')
  @ApiOperation({ summary: 'دوره اصلی (legacy alias)' })
  async legacyMasterclass(@CurrentUser() user: AuthUser) {
    const dashboard = await this.catalog.getDashboard(user.id);
    return dashboard.primaryCourse;
  }

  @Get('masterclass/certificate')
  @ApiOperation({ summary: 'گواهی دوره اصلی (legacy)' })
  getCertificate(@CurrentUser() user: AuthUser) {
    return this.catalog.getCertificate(user.id);
  }
}
