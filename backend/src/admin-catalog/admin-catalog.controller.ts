import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { AdminCatalogService } from './admin-catalog.service';
import {
  AdminListCoursesQueryDto,
  CreateSessionDto,
  CreateSlideDto,
  ReorderSlidesDto,
  UpsertCourseDto,
  UpsertPracticeTipDto,
  UpsertScheduleDto,
  UpsertSessionDto,
  UpsertSlideDto,
} from './dto/admin-catalog.dto';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Controller('admin')
@Roles(Role.ADMIN)
export class AdminCatalogController {
  constructor(private readonly adminCatalog: AdminCatalogService) {}

  @Get('courses')
  listCourses(@Query() query: AdminListCoursesQueryDto) {
    return this.adminCatalog.listCourses(query);
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.adminCatalog.getCourse(id);
  }

  @Post('courses')
  createCourse(@Body() dto: UpsertCourseDto) {
    return this.adminCatalog.createCourse(dto);
  }

  @Patch('courses/:id')
  updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCourseDto,
  ) {
    return this.adminCatalog.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteCourse(id);
  }

  @Get('courses/:courseId/sessions')
  listSessions(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.adminCatalog.listSessions(courseId);
  }

  @Post('courses/:courseId/sessions')
  createSession(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.adminCatalog.createSession(courseId, dto);
  }

  @Patch('sessions/:id')
  updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSessionDto,
  ) {
    return this.adminCatalog.updateSession(id, dto);
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteSession(id);
  }

  @Get('sessions/:sessionId/slides')
  listSlides(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.adminCatalog.listSlides(sessionId);
  }

  @Post('sessions/:sessionId/slides')
  createSlide(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: CreateSlideDto,
  ) {
    return this.adminCatalog.createSlide(sessionId, dto);
  }

  @Patch('slides/:id')
  updateSlide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertSlideDto,
  ) {
    return this.adminCatalog.updateSlide(id, dto);
  }

  @Delete('slides/:id')
  deleteSlide(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteSlide(id);
  }

  @Post('sessions/:sessionId/slides/reorder')
  reorderSlides(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ReorderSlidesDto,
  ) {
    return this.adminCatalog.reorderSlides(sessionId, dto);
  }

  @Get('courses/:courseId/schedule')
  listSchedule(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.adminCatalog.listSchedule(courseId);
  }

  @Post('courses/:courseId/schedule')
  createSchedule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpsertScheduleDto,
  ) {
    return this.adminCatalog.createSchedule(courseId, dto);
  }

  @Patch('schedule/:id')
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertScheduleDto,
  ) {
    return this.adminCatalog.updateSchedule(id, dto);
  }

  @Delete('schedule/:id')
  deleteSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteSchedule(id);
  }

  @Get('courses/:courseId/tips')
  listTips(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.adminCatalog.listTips(courseId);
  }

  @Post('courses/:courseId/tips')
  createTip(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpsertPracticeTipDto,
  ) {
    return this.adminCatalog.createTip(courseId, dto);
  }

  @Patch('tips/:id')
  updateTip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPracticeTipDto,
  ) {
    return this.adminCatalog.updateTip(id, dto);
  }

  @Delete('tips/:id')
  deleteTip(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCatalog.deleteTip(id);
  }
}
