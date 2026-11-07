import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/auth.decorators';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './dto/assistant.dto';

@ApiTags('Assistant')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @ApiOperation({ summary: 'دستیار موسیقی هنرجو' })
  chat(@Body() dto: AssistantChatDto) {
    return this.assistant.chat(dto);
  }
}
