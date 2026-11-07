import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import {
  CreateSupportMessageDto,
  CreateSupportTicketDto,
} from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'تیکت‌های هنرجو' })
  list(@CurrentUser() user: AuthUser) {
    return this.support.listStudent(user.id);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'ثبت تیکت جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSupportTicketDto) {
    return this.support.createStudent(user.id, dto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'جزئیات تیکت هنرجو' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.support.getStudent(user.id, id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'پاسخ هنرجو به تیکت' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.support.replyStudent(user.id, id, dto);
  }

  @Post('tickets/:id/seen')
  @ApiOperation({ summary: 'خوانده شدن پاسخ واحد' })
  seen(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.support.markStudentSeen(user.id, id);
  }
}
