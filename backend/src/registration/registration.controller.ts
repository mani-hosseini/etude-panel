import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import {
  CreateLeadDto,
  CreateLeadNoteDto,
  CreateTaskDto,
  UpdateTaskDto,
  UpsertLeadDto,
} from './dto/registration.dto';
import { RegistrationService } from './registration.service';

@ApiTags('Admin Registration')
@ApiBearerAuth()
@Controller('admin')
@Roles(Role.ADMIN)
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Get('leads')
  @ApiOperation({ summary: 'فهرست پرونده‌های ثبت‌نام' })
  listLeads() {
    return this.registration.listLeads();
  }

  @Post('leads')
  @ApiOperation({ summary: 'ثبت تماس جدید' })
  createLead(@Body() dto: CreateLeadDto) {
    return this.registration.createLead(dto);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'جزئیات پرونده ثبت‌نام' })
  getLead(@Param('id', ParseUUIDPipe) id: string) {
    return this.registration.getLead(id);
  }

  @Patch('leads/:id')
  @ApiOperation({ summary: 'ویرایش پرونده ثبت‌نام' })
  updateLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertLeadDto,
  ) {
    return this.registration.updateLead(id, dto);
  }

  @Delete('leads/:id')
  @ApiOperation({ summary: 'حذف پرونده ثبت‌نام' })
  deleteLead(@Param('id', ParseUUIDPipe) id: string) {
    return this.registration.deleteLead(id);
  }

  @Post('leads/:id/notes')
  @ApiOperation({ summary: 'ثبت نوت منشی روی پرونده' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadNoteDto,
  ) {
    return this.registration.addNote(id, dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'فهرست تسک‌های منشی' })
  listTasks() {
    return this.registration.listTasks();
  }

  @Post('tasks')
  @ApiOperation({ summary: 'ساخت تسک برای منشی' })
  createTask(@Body() dto: CreateTaskDto) {
    return this.registration.createTask(dto);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'ویرایش یا انجام تسک' })
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.registration.updateTask(id, dto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'حذف تسک' })
  deleteTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.registration.deleteTask(id);
  }
}
