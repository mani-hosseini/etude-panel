import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SUPPORT_UNITS = [
  'education',
  'finance',
  'reception',
  'tech',
] as const;
export type SupportUnitDto = (typeof SUPPORT_UNITS)[number];

export const SUPPORT_STATUSES = ['pending', 'replied', 'closed'] as const;
export type SupportStatusDto = (typeof SUPPORT_STATUSES)[number];

function emptyToUndefined(value: unknown) {
  if (value == null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

export class CreateSupportTicketDto {
  @ApiProperty({ enum: SUPPORT_UNITS })
  @IsIn(SUPPORT_UNITS, { message: 'واحد را درست انتخاب کنید.' })
  unitId: SupportUnitDto;

  @ApiProperty({ example: 'تأیید فیش شهریه' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'عنوان را کوتاه بنویسید.' })
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'فیش واریز را فرستادم.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'متن تیکت را بنویسید.' })
  @MaxLength(4000)
  body: string;
}

export class CreateSupportMessageDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: 'متن پیام را بنویسید.' })
  @MaxLength(4000)
  body: string;
}

export class UpdateSupportTicketDto {
  @ApiProperty({ enum: SUPPORT_STATUSES })
  @IsIn(SUPPORT_STATUSES, { message: 'وضعیت نامعتبر است.' })
  status: SupportStatusDto;
}

export class AdminSupportQueryDto {
  @ApiPropertyOptional({ enum: SUPPORT_UNITS })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsIn(SUPPORT_UNITS, { message: 'واحد نامعتبر است.' })
  unit?: SupportUnitDto;

  @ApiPropertyOptional({ enum: SUPPORT_STATUSES })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsIn(SUPPORT_STATUSES, { message: 'وضعیت نامعتبر است.' })
  status?: SupportStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  search?: string;
}
