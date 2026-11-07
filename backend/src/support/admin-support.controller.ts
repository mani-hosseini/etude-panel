import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import {
  AdminSupportQueryDto,
  CreateSupportMessageDto,
  UpdateSupportTicketDto,
} from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('Admin Support')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'فهرست تیکت‌های پشتیبانی' })
  list(@Query() query: AdminSupportQueryDto) {
    return this.support.listAdmin(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'آمار صندوق پشتیبانی' })
  stats() {
    return this.support.statsAdmin();
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'جزئیات تیکت پشتیبانی' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.support.getAdmin(id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'پاسخ واحد به تیکت' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.support.replyAdmin(id, dto);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'تغییر وضعیت تیکت' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.support.updateAdmin(id, dto);
  }
}
