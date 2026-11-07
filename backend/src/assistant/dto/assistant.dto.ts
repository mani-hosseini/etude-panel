import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AssistantMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'متن پیام را بنویسید.' })
  @MaxLength(6000, { message: 'پیام کوتاه‌تر بنویسید.' })
  content: string;
}

export class AssistantChatDto {
  @ApiProperty({ type: [AssistantMessageDto] })
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AssistantMessageDto)
  messages: AssistantMessageDto[];
}
